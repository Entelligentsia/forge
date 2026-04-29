#!/usr/bin/env bash

R=$'\033[0m'
B=$'\033[1m'
D=$'\033[2m'

f() { printf '\033[38;2;%d;%d;%dm' "$1" "$2" "$3"; }

rule() {
  printf "\n"
  printf "  $(f 45 45 65)$(printf '·%.0s' $(seq 1 32))${R}\n"
  printf "\n"
}

# ══════════════════════════════════
#  EMBER  —  heat · ignition · drive
# ══════════════════════════════════
printf "\n"
printf "  $(f 255 240 100)      )     ${R}\n"
printf "  $(f 255 200 50)    )   )   ${R}\n"
printf "  $(f 255 140 20)   ( ) ( )  ${R}\n"
printf "  $(f 230 80 10)    ((_))    ${R}\n"
printf "  $(f 170 30 5)    ~~~~~    ${R}\n"
printf "  ${B}$(f 255 170 60)EMBER${R}   $(f 160 95 40)${D}heat · ignition · drive${R}\n"

rule

# ══════════════════════════════════
#  TIDE  —  rhythm · pull · depth
# ══════════════════════════════════
printf "  $(f 210 240 255)  ∿   ∿   ∿   ${R}\n"
printf "  $(f 130 200 245) ≋≋≋≋≋≋≋≋≋≋  ${R}\n"
printf "  $(f 60 140 210)≋≋≋≋≋≋≋≋≋≋≋≋ ${R}\n"
printf "  $(f 25 85 175)▓▓▓▓▓▓▓▓▓▓▓▓ ${R}\n"
printf "  $(f 10 45 130)▓▓▓▓▓▓▓▓▓▓▓▓ ${R}\n"
printf "  ${B}$(f 110 200 255)TIDE${R}   $(f 65 130 185)${D}rhythm · pull · depth${R}\n"

rule

# ══════════════════════════════════
#  ORACLE  —  sight · pattern · knowing
# ══════════════════════════════════
printf "  $(f 160 80 240)   ·  ◌  ·   ${R}\n"
printf "  $(f 190 110 255)  ◌  ◎  ◌   ${R}\n"
printf "  $(f 230 190 80)   ·  $(f 255 220 100)◉$(f 230 190 80)  ·   ${R}\n"
printf "  $(f 190 110 255)  ◌  ◎  ◌   ${R}\n"
printf "  $(f 160 80 240)   ·  ◌  ·   ${R}\n"
printf "  ${B}$(f 210 160 255)ORACLE${R}   $(f 155 110 210)${D}sight · pattern · knowing${R}\n"

rule

# ══════════════════════════════════
#  RIFT  —  edge · fracture · crossing
# ══════════════════════════════════
printf "  $(f 0 240 230)▓▓▒▒░░$(f 180 0 220)░░▒▒▓▓${R}\n"
printf "  $(f 0 200 200)  ▒░  $(f 220 0 255)  ░▒   ${R}\n"
printf "  $(f 0 255 240)  ╲   $(f 255 0 240)  ╱    ${R}\n"
printf "  $(f 0 200 200)   ╲  $(f 220 0 255) ╱     ${R}\n"
printf "  $(f 0 240 230)▓▓▒▒░░$(f 180 0 220)░░▒▒▓▓${R}\n"
printf "  ${B}$(f 100 255 240)RIFT${R}   $(f 70 190 180)${D}edge · fracture · crossing${R}\n"

rule

# ══════════════════════════════════
#  BLOOM  —  growth · opening · becoming
# ══════════════════════════════════
printf "  $(f 255 160 200)    ✿ ✿ ✿    ${R}\n"
printf "  $(f 255 120 170)  ✿  ✾ ✾  ✿  ${R}\n"
printf "  $(f 220 255 160)  ✿ ✾  $(f 255 220 100)✽$(f 220 255 160) ✾ ✿  ${R}\n"
printf "  $(f 255 120 170)  ✿  ✾ ✾  ✿  ${R}\n"
printf "  $(f 255 160 200)    ✿ ✿ ✿    ${R}\n"
printf "  ${B}$(f 255 160 190)BLOOM${R}   $(f 190 130 155)${D}growth · opening · becoming${R}\n"

rule

# ══════════════════════════════════
#  NORTH  —  direction · clarity · cold
# ══════════════════════════════════
printf "  $(f 200 230 255)      ✦      ${R}\n"
printf "  $(f 150 195 240)    ╱   ╲    ${R}\n"
printf "  $(f 100 160 230)  ✦   ◈   ✦  ${R}\n"
printf "  $(f 150 195 240)    ╲   ╱    ${R}\n"
printf "  $(f 200 230 255)      ✦      ${R}\n"
printf "  ${B}$(f 190 225 255)NORTH${R}   $(f 140 175 210)${D}direction · clarity · cold${R}\n"

rule

# ══════════════════════════════════
#  LUMEN  —  light · warmth · clarity
# ══════════════════════════════════
printf "  $(f 255 255 200)    ✧ · ✧    ${R}\n"
printf "  $(f 255 245 160)  · ╲  │  ╱ ·  ${R}\n"
printf "  $(f 255 235 120)  ✧──$(f 255 255 255) ◉ $(f 255 235 120)──✧  ${R}\n"
printf "  $(f 255 245 160)  · ╱  │  ╲ ·  ${R}\n"
printf "  $(f 255 255 200)    ✧ · ✧    ${R}\n"
printf "  ${B}$(f 255 245 150)LUMEN${R}   $(f 200 185 110)${D}light · warmth · clarity${R}\n"

rule

# ══════════════════════════════════
#  FORGE  —  making · heat · craft
# ══════════════════════════════════
printf "  $(f 255 230 80) ✦    ✧   ✦  ${R}\n"
printf "  $(f 200 80 20)  ▄▄▄▄▄▄▄▄   ${R}\n"
printf "  $(f 170 50 10)  █$(f 230 100 30)▓▓▓▓▓▓$(f 170 50 10)█   ${R}\n"
printf "  $(f 140 30 5)  ▀▀▀▀▀▀▀▀   ${R}\n"
printf "  $(f 255 160 40)  ≋ ≋ ≋ ≋    ${R}\n"
printf "  ${B}$(f 255 160 40)FORGE${R}   $(f 190 120 40)${D}making · heat · craft${R}\n"

rule

# ══════════════════════════════════
#  DRIFT  —  ease · letting go · flow
# ══════════════════════════════════
printf "  $(f 160 200 170)  ·    ·       ${R}\n"
printf "  $(f 140 180 155)    ·    ·  ·  ${R}\n"
printf "  $(f 120 165 140)  ·  ·    ·    ${R}\n"
printf "  $(f 100 150 125)     ·  ·      ${R}\n"
printf "  $(f 80 135 110)  ·      ·  ·  ${R}\n"
printf "  ${B}$(f 150 200 165)DRIFT${R}   $(f 110 155 125)${D}ease · letting go · flow${R}\n"

rule

# ══════════════════════════════════
#  VOID  —  depth · silence · potential
# ══════════════════════════════════
printf "  $(f 30 20 60)                 ${R}\n"
printf "  $(f 50 35 90)    ·       ·    ${R}\n"
printf "  $(f 70 50 120)        ◌        ${R}\n"
printf "  $(f 50 35 90)    ·       ·    ${R}\n"
printf "  $(f 30 20 60)                 ${R}\n"
printf "  ${B}$(f 130 100 200)VOID${R}   $(f 90 70 145)${D}depth · silence · potential${R}\n"

printf "\n"
