package vn.vku.judge.backend.judge;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OutputComparatorTest {
    @Test
    void ignoresTrailingWhitespaceAndLineEndings() {
        assertTrue(OutputComparator.matches("1 2\n3\n", "1 2  \r\n3\r\n\r\n\r\n"));
        assertTrue(OutputComparator.matches("", "\n \n"));
    }

    @Test
    void detectsRealDifferences() {
        assertFalse(OutputComparator.matches("1 2", "1  2"));
        assertFalse(OutputComparator.matches("a\nb", "a\n\nb"));
        assertFalse(OutputComparator.matches("hello", "Hello"));
    }

    @Test
    void floatToleranceCheckerWorks() {
        assertTrue(OutputComparator.matches("3.1415926", "3.1415928", "FLOAT_1E6"));
        assertFalse(OutputComparator.matches("3.1415926", "3.15", "FLOAT_1E6"));
        assertTrue(OutputComparator.matches("10.0000", "10.00005", "FLOAT_1E4"));
    }

    @Test
    void tokensIgnoreCaseWorks() {
        assertTrue(OutputComparator.matches("YES\nNO", "yes   no", "TOKENS_IGNORE_CASE"));
        assertFalse(OutputComparator.matches("YES", "NO", "TOKENS_IGNORE_CASE"));
    }

    @Test
    void verdictAggregationFollowsPriority() {
        assertEquals(Verdict.ACCEPTED, Verdict.aggregate(List.of("ACCEPTED", "ACCEPTED")));
        assertEquals(Verdict.WRONG_ANSWER, Verdict.aggregate(List.of("ACCEPTED", "WRONG_ANSWER")));
        assertEquals(Verdict.TIME_LIMIT_EXCEEDED, Verdict.aggregate(List.of("WRONG_ANSWER", "TIME_LIMIT_EXCEEDED")));
        assertEquals(Verdict.MEMORY_LIMIT_EXCEEDED,
                Verdict.aggregate(List.of("TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED")));
        assertEquals(Verdict.RUNTIME_ERROR, Verdict.aggregate(List.of("MEMORY_LIMIT_EXCEEDED", "RUNTIME_ERROR")));
    }
}
