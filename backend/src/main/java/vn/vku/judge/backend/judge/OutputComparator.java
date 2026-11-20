package vn.vku.judge.backend.judge;

/** So khớp output: chuẩn hóa xuống dòng, bỏ khoảng trắng thừa cuối dòng và dòng trống cuối file. */
public final class OutputComparator {
    private OutputComparator() {}

    public static String normalize(String s) {
        if (s == null) return "";
        String[] lines = s.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        int end = lines.length;
        while (end > 0 && lines[end - 1].stripTrailing().isEmpty()) end--;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < end; i++) {
            if (i > 0) sb.append('\n');
            sb.append(lines[i].stripTrailing());
        }
        return sb.toString();
    }

    public static boolean matches(String expected, String actual) {
        return normalize(expected).equals(normalize(actual));
    }
}
