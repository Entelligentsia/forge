#!/usr/bin/env bash
# Forge Banner Library — bash wrapper around banners.cjs
#
# Source this file to get banner_* functions in any shell script.
#
# Usage:
#   source "$(dirname "$0")/banners.sh"
#
#   banner_render forge       # full ASCII art block
#   banner_badge  north       # single-line: emoji + name + tagline
#   banner_mark   tide        # emoji only
#   banner_list               # list all names
#   banner_gallery            # full gallery of all banners

_BANNERS_JS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/banners.cjs"

banner_render()  { node "$_BANNERS_JS" "${1:?banner name required}"; }
banner_badge()   { node "$_BANNERS_JS" --badge "${1:?banner name required}"; }
banner_mark()    { node "$_BANNERS_JS" --mark  "${1:?banner name required}"; }
banner_list()    { node "$_BANNERS_JS" --list; }
banner_gallery() { node "$_BANNERS_JS" --gallery; }
