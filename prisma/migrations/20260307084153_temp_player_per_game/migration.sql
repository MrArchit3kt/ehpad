-- AlterTable
ALTER TABLE "TempPlayer" ADD COLUMN     "game" "MixGame" NOT NULL DEFAULT 'WARZONE',
ADD COLUMN     "rocketLeagueRank" "RocketLeagueRank";

-- CreateIndex
CREATE INDEX "TempPlayer_game_idx" ON "TempPlayer"("game");
