import { describe, expect, it } from "vitest";
import { isPickCorrect } from "./scoring";
import type { Pick, Matchup } from "../../../drizzle/schema";

describe("isPickCorrect", () => {
  const createMatchup = (overrides: Partial<Matchup> = {}): Matchup => ({
    id: 1,
    weekId: 1,
    externalGameId: "game-1",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    homeTeamAbbr: "KC",
    awayTeamAbbr: "BUF",
    pointSpread: "-3.5",
    spreadFavor: "home",
    gameTime: new Date(),
    homeScore: 24,
    awayScore: 20,
    gameStatus: "final",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createPick = (overrides: Partial<Pick> = {}): Pick => ({
    id: 1,
    userId: 1,
    matchupId: 1,
    weekId: 1,
    pickedTeam: "KC",
    isCorrect: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it("returns null if game is not final", () => {
    const matchup = createMatchup({ gameStatus: "scheduled", homeScore: null, awayScore: null });
    const pick = createPick();
    expect(isPickCorrect(pick, matchup)).toBeNull();
  });

  it("returns true when home favorite wins by more than spread", () => {
    // KC -3.5, KC wins 24-20 (4 point win, beats -3.5 spread)
    const matchup = createMatchup({
      homeTeamAbbr: "KC",
      awayTeamAbbr: "BUF",
      pointSpread: "-3.5",
      spreadFavor: "home",
      homeScore: 24,
      awayScore: 20,
    });
    const pick = createPick({ pickedTeam: "KC" });
    expect(isPickCorrect(pick, matchup)).toBe(true);
  });

  it("returns false when home favorite wins by less than spread", () => {
    // KC -3.5, KC wins 23-20 (3 point win, loses -3.5 spread)
    const matchup = createMatchup({
      homeTeamAbbr: "KC",
      awayTeamAbbr: "BUF",
      pointSpread: "-3.5",
      spreadFavor: "home",
      homeScore: 23,
      awayScore: 20,
    });
    const pick = createPick({ pickedTeam: "KC" });
    expect(isPickCorrect(pick, matchup)).toBe(false);
  });

  it("returns true when home underdog wins", () => {
    // BUF +3.5, BUF wins 24-20 (beats +3.5 spread)
    const matchup = createMatchup({
      homeTeamAbbr: "BUF",
      awayTeamAbbr: "KC",
      pointSpread: "3.5",
      spreadFavor: "away",
      homeScore: 24,
      awayScore: 20,
    });
    const pick = createPick({ pickedTeam: "BUF" });
    expect(isPickCorrect(pick, matchup)).toBe(true);
  });

  it("returns true when away favorite wins by more than spread", () => {
    // KC -3.5 (away), KC wins 24-20 (beats -3.5 spread)
    const matchup = createMatchup({
      homeTeamAbbr: "BUF",
      awayTeamAbbr: "KC",
      pointSpread: "-3.5",
      spreadFavor: "away",
      homeScore: 20,
      awayScore: 24,
    });
    const pick = createPick({ pickedTeam: "KC" });
    expect(isPickCorrect(pick, matchup)).toBe(true);
  });

  it("returns true when away underdog loses by less than spread", () => {
    // BUF +3.5 (away), BUF loses 20-23 (loses by 3, beats +3.5 spread)
    const matchup = createMatchup({
      homeTeamAbbr: "KC",
      awayTeamAbbr: "BUF",
      pointSpread: "3.5",
      spreadFavor: "home",
      homeScore: 23,
      awayScore: 20,
    });
    const pick = createPick({ pickedTeam: "BUF" });
    expect(isPickCorrect(pick, matchup)).toBe(true);
  });
});
