#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${CLAUDE_CODE_PET_HOME:-$HOME/.claude-code-pet}"
SOURCE_BIN="${1:-src-tauri/target/release/claude-code-pet}"

info()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
error() { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

main() {
  info "Claude Code Pet local installer"

  if [ ! -f "$SOURCE_BIN" ]; then
    error "Built binary not found at $SOURCE_BIN. Run: npm run build"
  fi

  mkdir -p "$INSTALL_DIR"
  cp "$SOURCE_BIN" "$INSTALL_DIR/claude-code-pet"
  chmod +x "$INSTALL_DIR/claude-code-pet"

  # Built-in themes live next to the binary (see themes.rs lookup order).
  if [ -d "src/themes" ]; then
    rm -rf "$INSTALL_DIR/themes.tmp"
    cp -R "src/themes" "$INSTALL_DIR/themes.tmp"
    rm -rf "$INSTALL_DIR/themes"
    mv "$INSTALL_DIR/themes.tmp" "$INSTALL_DIR/themes"
    info "Installed built-in themes to $INSTALL_DIR/themes"
  fi

  info "Installed to $INSTALL_DIR/claude-code-pet"
  info ""
  info "Run the app:"
  info "  $INSTALL_DIR/claude-code-pet"
  info ""
  info "Install Claude Code hooks only when you want them:"
  info "  $INSTALL_DIR/claude-code-pet install-claude-hooks"
  info ""
  info "Remove those hooks later:"
  info "  $INSTALL_DIR/claude-code-pet uninstall-claude-hooks"
}

main "$@"
