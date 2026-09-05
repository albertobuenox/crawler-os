"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dieLabel,
  makeSceneDiceEvent,
  parseSceneDiceEvent,
  reduceSceneDice,
  rollDie,
  type SceneDiceEvent,
  type SceneDiceState,
  type SceneDieSides,
} from "@/lib/scene-dice";
import type { AvatarEmotion } from "@/lib/crawler-art";
import { postSceneLog, SCENE_LOG_KIND } from "@/lib/scene-log";

type BroadcastFn = (event: string, payload: unknown) => void | Promise<void>;

type SelfDice = {
  id: string;
  name: string;
  emotion: AvatarEmotion | null;
  portraitUrl: string | null;
};

export function useSceneDice(
  broadcast: BroadcastFn,
  self: SelfDice | null,
  sessionId?: string
) {
  const [state, setState] = useState<SceneDiceState | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  const ingest = useCallback((payload: unknown) => {
    const ev = parseSceneDiceEvent(payload);
    if (!ev) return;
    setState((prev) => reduceSceneDice(prev, ev));
  }, []);

  const emit = useCallback(
    (event: SceneDiceEvent) => {
      setState((prev) => reduceSceneDice(prev, event));
      void broadcast("dice_anim", event);
    },
    [broadcast]
  );

  useEffect(() => {
    if (state?.mode === "choosing") {
      document.documentElement.dataset.diceVeil = "";
    } else {
      delete document.documentElement.dataset.diceVeil;
    }
    return () => {
      delete document.documentElement.dataset.diceVeil;
    };
  }, [state?.mode]);

  const announceChoosing = useCallback(
    (open: boolean) => {
      if (!self) return;
      emit(
        makeSceneDiceEvent({
          phase: open ? "choosing" : "idle",
          crawlerId: self.id,
          name: self.name,
          sides: null,
          value: null,
          emotion: self.emotion,
          portraitUrl: self.portraitUrl,
        })
      );
    },
    [emit, self]
  );

  const pickDie = useCallback(
    (sides: SceneDieSides) => {
      if (!self) return;
      emit(
        makeSceneDiceEvent({
          phase: "ready",
          crawlerId: self.id,
          name: self.name,
          sides,
          value: null,
          emotion: self.emotion,
          portraitUrl: self.portraitUrl,
        })
      );
    },
    [emit, self]
  );

  const revealRoll = useCallback(() => {
    if (!self || state?.mode !== "ceremony" || state.crawlerId !== self.id || state.value != null) {
      return;
    }
    const value = rollDie(state.sides);
    emit(
      makeSceneDiceEvent({
        phase: "result",
        crawlerId: self.id,
        name: self.name,
        sides: state.sides,
        value,
        emotion: state.emotion,
        portraitUrl: state.portraitUrl,
      })
    );
    const sid = sessionRef.current;
    if (sid) {
      void postSceneLog({
        kind: SCENE_LOG_KIND.roll,
        sessionId: sid,
        crawlerId: self.id,
        formula: `1${dieLabel(state.sides)}`,
        sides: state.sides,
        value,
      });
    }
  }, [emit, self, state]);

  const closeCeremony = useCallback(() => {
    if (!state) return;
    emit(
      makeSceneDiceEvent({
        phase: "close",
        crawlerId: state.crawlerId,
        name: state.name,
        sides: state.mode === "ceremony" ? state.sides : null,
        value: state.mode === "ceremony" ? state.value : null,
        emotion: state.mode === "ceremony" ? state.emotion : null,
        portraitUrl: state.mode === "ceremony" ? state.portraitUrl : null,
      })
    );
  }, [emit, state]);

  const selfRef = useRef(self);
  const stateRef = useRef(state);
  selfRef.current = self;
  stateRef.current = state;

  useEffect(() => {
    return () => {
      const me = selfRef.current;
      const current = stateRef.current;
      if (!me || current?.mode !== "choosing" || current.crawlerId !== me.id) return;
      void broadcast(
        "dice_anim",
        makeSceneDiceEvent({
          phase: "idle",
          crawlerId: me.id,
          name: me.name,
          sides: null,
          value: null,
          emotion: me.emotion,
          portraitUrl: me.portraitUrl,
        })
      );
    };
  }, [broadcast]);

  return {
    state,
    ingest,
    announceChoosing,
    pickDie,
    revealRoll,
    closeCeremony,
    selfId: self?.id ?? null,
  };
}
