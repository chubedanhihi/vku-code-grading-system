package vn.vku.judge.backend.service;

import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Service;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.judge.Verdict;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.UserRepository;

import java.util.*;

/**
 * Kiểm tra đạo văn (Plagiarism Check) dùng kỹ thuật chuẩn hóa token + k-gram Jaccard similarity.
 */
@Service
public class PlagiarismService {
    private static final int K_GRAM = 5;

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    public PlagiarismService(SubmissionRepository submissionRepository, UserRepository userRepository) {
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
    }

    @Data
    @Builder
    public static class PlagiarismMatch {
        private Long userAId;
        private String userAName;
        private Long submissionAId;
        private Long userBId;
        private String userBName;
        private Long submissionBId;
        private String language;
        private double similarityPercent;
    }

    public List<PlagiarismMatch> checkProblem(long problemId) {
        List<Submission> accepted = submissionRepository.findByProblemIdAndStatus(problemId, Verdict.ACCEPTED);
        // Lấy bài AC mới nhất của mỗi user
        Map<Long, Submission> latestPerUser = new LinkedHashMap<>();
        for (Submission s : accepted) {
            Submission prev = latestPerUser.get(s.getUserId());
            if (prev == null || s.getId() > prev.getId()) {
                latestPerUser.put(s.getUserId(), s);
            }
        }
        List<Submission> subs = new ArrayList<>(latestPerUser.values());
        if (subs.size() < 2) return List.of();

        Map<Long, String> usernames = new HashMap<>();
        userRepository.findAllById(latestPerUser.keySet()).forEach((User u) -> usernames.put(u.getId(), u.getUsername()));

        Map<Long, Set<Integer>> fingerprints = new HashMap<>();
        for (Submission s : subs) {
            fingerprints.put(s.getId(), fingerprint(s.getSourceCode()));
        }

        List<PlagiarismMatch> matches = new ArrayList<>();
        for (int i = 0; i < subs.size(); i++) {
            for (int j = i + 1; j < subs.size(); j++) {
                Submission a = subs.get(i);
                Submission b = subs.get(j);
                double sim = jaccard(fingerprints.get(a.getId()), fingerprints.get(b.getId()));
                double pct = Math.round(sim * 1000.0) / 10.0;
                if (pct >= 25.0) {
                    matches.add(PlagiarismMatch.builder()
                            .userAId(a.getUserId())
                            .userAName(usernames.getOrDefault(a.getUserId(), "User #" + a.getUserId()))
                            .submissionAId(a.getId())
                            .userBId(b.getUserId())
                            .userBName(usernames.getOrDefault(b.getUserId(), "User #" + b.getUserId()))
                            .submissionBId(b.getId())
                            .language(a.getLanguage().equals(b.getLanguage()) ? a.getLanguage()
                                    : a.getLanguage() + "/" + b.getLanguage())
                            .similarityPercent(pct)
                            .build());
                }
            }
        }
        matches.sort(Comparator.comparingDouble(PlagiarismMatch::getSimilarityPercent).reversed());
        return matches;
    }

    static Set<Integer> fingerprint(String code) {
        if (code == null || code.isBlank()) return Set.of();
        // Bỏ comment //, /*...*/, # và chuẩn hóa token
        String stripped = code
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("//.*", " ")
                .replaceAll("#.*", " ");
        String[] rawTokens = stripped.split("[^A-Za-z0-9_]+|(?<=\\W)|(?=\\W)");
        List<String> tokens = new ArrayList<>();
        for (String t : rawTokens) {
            String trimmed = t.trim();
            if (!trimmed.isEmpty()) tokens.add(trimmed);
        }
        Set<Integer> hashes = new HashSet<>();
        if (tokens.size() < K_GRAM) {
            if (!tokens.isEmpty()) hashes.add(String.join(" ", tokens).hashCode());
            return hashes;
        }
        for (int i = 0; i <= tokens.size() - K_GRAM; i++) {
            StringBuilder gram = new StringBuilder();
            for (int k = 0; k < K_GRAM; k++) {
                if (k > 0) gram.append('\0');
                gram.append(tokens.get(i + k));
            }
            hashes.add(gram.toString().hashCode());
        }
        return hashes;
    }

    private static double jaccard(Set<Integer> a, Set<Integer> b) {
        if (a.isEmpty() || b.isEmpty()) return 0.0;
        int inter = 0;
        for (Integer x : a) {
            if (b.contains(x)) inter++;
        }
        int union = a.size() + b.size() - inter;
        return union == 0 ? 0.0 : (double) inter / union;
    }
}
