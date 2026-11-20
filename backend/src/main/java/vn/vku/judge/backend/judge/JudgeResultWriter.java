package vn.vku.judge.backend.judge;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.vku.judge.backend.entity.Submission;
import vn.vku.judge.backend.entity.SubmissionResult;
import vn.vku.judge.backend.judge.RunTypes.JudgeOutcome;
import vn.vku.judge.backend.judge.RunTypes.TestOutcome;
import vn.vku.judge.backend.repository.SubmissionRepository;
import vn.vku.judge.backend.repository.SubmissionResultRepository;

/** Ghi kết quả chấm vào DB trong một transaction (bean riêng để @Transactional có hiệu lực). */
@Component
public class JudgeResultWriter {
    private final SubmissionRepository submissions;
    private final SubmissionResultRepository results;

    public JudgeResultWriter(SubmissionRepository submissions, SubmissionResultRepository results) {
        this.submissions = submissions;
        this.results = results;
    }

    @Transactional
    public void complete(long submissionId, JudgeOutcome o) {
        Submission s = submissions.findById(submissionId).orElse(null);
        if (s == null) return;
        s.setStatus(o.verdict());
        s.setPassedTests(o.passed());
        s.setTotalTests(o.total());
        s.setExecutionTime(o.maxTimeMs());
        s.setMemoryUsed(o.maxMemoryKb());
        s.setErrorMessage(o.errorMessage());
        submissions.save(s);

        results.deleteBySubmissionId(submissionId);
        for (TestOutcome t : o.tests()) {
            SubmissionResult r = new SubmissionResult();
            r.setSubmissionId(submissionId);
            r.setTestCaseId(t.testCaseId());
            r.setTestIndex(t.index());
            r.setVerdict(t.verdict());
            r.setTimeMs(t.timeMs());
            r.setMemoryKb(t.memoryKb());
            r.setSample(t.sample());
            r.setMessage(t.message());
            results.save(r);
        }
    }
}
