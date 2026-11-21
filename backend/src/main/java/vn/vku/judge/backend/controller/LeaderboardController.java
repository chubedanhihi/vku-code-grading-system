package vn.vku.judge.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.vku.judge.backend.dto.LeaderboardEntry;
import vn.vku.judge.backend.service.LeaderboardService;

import vn.vku.judge.backend.security.Public;

import java.util.List;

@Public
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public List<LeaderboardEntry> getLeaderboard() {
        return leaderboardService.getLeaderboard();
    }
}
