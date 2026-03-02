"use client";

import { useMemo, useState } from "react";
import { addPlayerToPool } from "@/server/mix/add-player-to-pool";

type CandidatePlayer = {
  id: string;
  displayName: string;
  username: string;
  warzoneUsername: string;
  platform: string | null;
};

type AdminPoolAdderProps = {
  players: CandidatePlayer[];
};

export function AdminPoolAdder({ players }: AdminPoolAdderProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    if (!normalizedQuery) {
      return players;
    }

    return players.filter((player) => {
      const displayName = player.displayName.toLowerCase();
      const username = player.username.toLowerCase();
      const warzoneUsername = player.warzoneUsername.toLowerCase();

      return (
        displayName.startsWith(normalizedQuery) ||
        username.startsWith(normalizedQuery) ||
        warzoneUsername.startsWith(normalizedQuery)
      );
    });
  }, [players, normalizedQuery]);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300/75">
            Ajouter manuellement au pool
          </p>
          <p className="neon-text-muted mt-2 text-sm">
            Recherche par début de texte : si tu tapes <strong>r</strong>, seuls les
            joueurs commençant par <strong>r</strong> s’affichent.
          </p>
        </div>

        <div className="w-full lg:max-w-sm">
          <label className="mb-2 block text-sm font-semibold text-white">
            Rechercher un joueur
          </label>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: r"
            className="w-full px-4 py-3"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlayers.length === 0 ? (
          <div className="neon-card-soft p-4 md:col-span-2 xl:col-span-3">
            <p className="neon-text-muted text-sm">
              Aucun joueur correspondant.
            </p>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <div key={player.id} className="neon-card-soft p-4">
              <h4 className="text-base font-bold text-white">{player.displayName}</h4>
              <p className="neon-text-muted mt-1 text-sm">@{player.username}</p>
              <p className="neon-text-muted mt-2 text-sm">
                Warzone : <span className="text-white">{player.warzoneUsername}</span>
              </p>
              <p className="neon-text-muted mt-1 text-sm">
                Plateforme :{" "}
                <span className="text-white">
                  {player.platform ?? "Non renseignée"}
                </span>
              </p>

              <form action={addPlayerToPool} className="mt-4">
                <input type="hidden" name="userId" value={player.id} />
                <button
                  type="submit"
                  className="neon-button-secondary w-full px-4 py-3"
                >
                  Ajouter au pool
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}