package vn.vku.judge.backend.service;

import org.springframework.stereotype.Service;
import vn.vku.judge.backend.dto.LeaderboardEntry;
import vn.vku.judge.backend.entity.Problem;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.User;
import vn.vku.judge.backend.repository.ProblemRepository;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.UserRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;

    public LeaderboardService(UserRepository userRepository,
                              SubmissionRepository submissionRepository,
                              ProblemRepository problemRepository) {
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
    }

    public List<LeaderboardEntry> getLeaderboard() {
        List<User> users = userRepository.findAll();
        List<Problem> problems = problemRepository.findAll();
        List<Submission> allSubmissions = submissionRepository.findAll();

        // Map problemId -> Problem điểm số
        Map<Long, Integer> problemScoreMap = new HashMap<>();
        for (Problem p : problems) {
            int score = 100;
            if (p.getDifficulty() == Problem.Difficulty.MEDIUM) {
                score = 200;
            } else if (p.getDifficulty() == Problem.Difficulty.HARD) {
                score = 300;
            }
            problemScoreMap.put(p.getId(), score);
        }

        // Nhóm bài nộp theo userId
        Map<Long, List<Submission>> userSubmissionsMap = allSubmissions.stream()
                .filter(s -> s.getUserId() != null)
                .collect(Collectors.groupingBy(Submission::getUserId));

        List<LeaderboardEntry> entries = new ArrayList<>();

        for (User u : users) {
            List<Submission> userSubs = userSubmissionsMap.getOrDefault(u.getId(), Collections.emptyList());

            long totalSubmissions = userSubs.size();
            long acceptedSubmissions = userSubs.stream()
                    .filter(s -> "ACCEPTED".equalsIgnoreCase(s.getStatus()))
                    .count();

            // Tập hợp các problemId đã AC (mỗi bài chỉ tính điểm 1 lần)
            Set<Long> solvedProblemIds = userSubs.stream()
                    .filter(s -> "ACCEPTED".equalsIgnoreCase(s.getStatus()))
                    .map(Submission::getProblemId)
                    .collect(Collectors.toSet());

            long solvedCount = solvedProblemIds.size();

            int totalScore = solvedProblemIds.stream()
                    .mapToInt(pid -> problemScoreMap.getOrDefault(pid, 100))
                    .sum();

            double accuracyRate = totalSubmissions > 0
                    ? Math.round((acceptedSubmissions * 100.0 / totalSubmissions) * 10.0) / 10.0
                    : 0.0;

            String tier = "BRONZE";
            if (totalScore >= 400 || solvedCount >= 3) {
                tier = "MASTER";
            } else if (totalScore >= 200 || solvedCount >= 2) {
                tier = "GOLD";
            } else if (totalScore >= 100 || solvedCount >= 1) {
                tier = "SILVER";
            }

            entries.add(LeaderboardEntry.builder()
                    .userId(u.getId())
                    .username(u.getUsername())
                    .email(u.getEmail())
                    .role(u.getRole() != null ? u.getRole() : "STUDENT")
                    .solvedCount(solvedCount)
                    .totalSubmissions(totalSubmissions)
                    .acceptedSubmissions(acceptedSubmissions)
                    .accuracyRate(accuracyRate)
                    .totalScore(totalScore)
                    .tier(tier)
                    .build());
        }

        // Sắp xếp: solvedCount DESC -> totalScore DESC -> accuracyRate DESC
        entries.sort(Comparator.comparingLong(LeaderboardEntry::getSolvedCount).reversed()
                .thenComparingInt(LeaderboardEntry::getTotalScore).reversed()
                .thenComparingDouble(LeaderboardEntry::getAccuracyRate).reversed()
                .thenComparing(LeaderboardEntry::getUsername));

        // Gán rank 1, 2, 3...
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }

        return entries;
    }
}
