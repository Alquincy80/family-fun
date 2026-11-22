// ============================================================================
//  TUNK TABLE LOOK — SINGLE SOURCE OF TRUTH
// ============================================================================
//  *** PENDING — DO NOT FINALIZE ***
//  Al is still deciding what pattern the Tunk table should follow. He has
//  corrected two directions already:
//    - NOT a copy of the C.F.N.B. Cutthroat table (do not touch that game,
//      do not reuse its table).
//    - NOT the pirate-game pictures either (that direction was corrected).
//  Until the parent agent sends the confirmed direction, the table keeps
//  this PLACEHOLDER look: dark walnut planks with copper trim —
//  deliberately different from C.F.N.B.'s light oak + brass, and not the
//  pirate pictures. Everything about the table's look lives in this file
//  only, so when the confirmed direction arrives, change THIS file and
//  nothing else. `TunkTable.tsx` reads every table color from here.
//
//  What this file does NOT own:
//    - The felt centre of the table — that is the unlockable table theme
//      (FELTS in ./tunk.ts), earned free by playing. This file owns the
//      frame, trim, portraits and name plates around it.
//    - The home screen, Rewards page and Store — those use the parchment
//      variables in ./theme.css and keep the same wood/parchment family.
//    - The characters themselves — cartoon portraits in ./assets/.
// ============================================================================

export const TABLE_STYLE = {
  /** Outer table frame (the thick border around the whole table). */
  frame: "#4a2c17", // dark walnut
  /** Thin inner line inside the frame. */
  innerLine: "rgba(214, 158, 106, 0.45)", // copper, translucent
  /** Turn glow around the active player's portrait. */
  turnGlow: "#f59e0b",
  turnGlowShadow: "rgba(245, 158, 11, 0.8)",
  /** Portrait frame backing (behind the character image). */
  portraitBack: "#2c1a0e",
  /** Portrait frame border when it is not that player's turn. */
  portraitFrame: "#4a2c17",
  /** Name plate under each portrait. */
  namePlateBg: "#241407",
  namePlateText: "#fde68a",
  namePlateSubtext: "rgba(254, 243, 199, 0.8)",
  /** Text on the felt centre (spread owner names, "no spreads yet"). */
  feltText: "#fef3c7",
  feltTextDim: "rgba(254, 243, 199, 0.5)",
  /** "spreads down" note under a portrait. */
  spreadNote: "#6ee7b7",
} as const;
