package vn.vku.judge.backend.judge;

/**
 * So khớp output với nhiều chế độ:
 * - EXACT (mặc định): chuẩn hóa xuống dòng, bỏ khoảng trắng thừa cuối dòng và dòng trống cuối.
 * - FLOAT_1E6 / FLOAT_1E4: so sánh từng token số thực với sai số 1e-6 hoặc 1e-4.
 * - TOKENS_IGNORE_CASE: so sánh từng token bỏ qua khoảng trắng và không phân biệt hoa/thường.
 */
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
        return matches(expected, actual, "EXACT");
    }

    public static boolean matches(String expected, String actual, String checkerMode) {
        String mode = checkerMode == null ? "EXACT" : checkerMode.trim().toUpperCase();
        return switch (mode) {
            case "FLOAT_1E6" -> matchesFloat(expected, actual, 1e-6);
            case "FLOAT_1E4" -> matchesFloat(expected, actual, 1e-4);
            case "TOKENS_IGNORE_CASE" -> matchesTokensIgnoreCase(expected, actual);
            default -> normalize(expected).equals(normalize(actual));
        };
    }

    private static boolean matchesTokensIgnoreCase(String expected, String actual) {
        String[] e = tokenize(expected);
        String[] a = tokenize(actual);
        if (e.length != a.length) return false;
        for (int i = 0; i < e.length; i++) {
            if (!e[i].equalsIgnoreCase(a[i])) return false;
        }
        return true;
    }

    private static boolean matchesFloat(String expected, String actual, double eps) {
        String[] e = tokenize(expected);
        String[] a = tokenize(actual);
        if (e.length != a.length) return false;
        for (int i = 0; i < e.length; i++) {
            try {
                double ev = Double.parseDouble(e[i]);
                double av = Double.parseDouble(a[i]);
                if (Double.isNaN(av) || Double.isInfinite(av) != Double.isInfinite(ev)) return false;
                double diff = Math.abs(ev - av);
                if (diff > eps && diff > eps * Math.max(1.0, Math.abs(ev))) return false;
            } catch (NumberFormatException ex) {
                if (!e[i].equals(a[i])) return false;
            }
        }
        return true;
    }

    private static String[] tokenize(String s) {
        if (s == null || s.isBlank()) return new String[0];
        return s.trim().split("\\s+");
    }
}
