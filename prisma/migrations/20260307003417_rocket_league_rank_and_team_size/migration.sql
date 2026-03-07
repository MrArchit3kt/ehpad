-- CreateEnum
CREATE TYPE "RocketLeagueRank" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHAMPION', 'GRAND_CHAMPION', 'SSL');

-- CreateEnum
CREATE TYPE "RocketLeagueTeamSize" AS ENUM ('TWO', 'THREE');

-- AlterTable
ALTER TABLE "MixGenerationLock" ADD COLUMN     "rocketLeagueTeamSize" "RocketLeagueTeamSize";

-- AlterTable
ALTER TABLE "MixSession" ADD COLUMN     "rocketLeagueTeamSize" "RocketLeagueTeamSize";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rocketLeagueRank" "RocketLeagueRank";

-- CreateIndex
CREATE INDEX "User_rocketLeagueRank_idx" ON "User"("rocketLeagueRank");
