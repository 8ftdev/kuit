package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Keep the editable viewer in site/ as the single source for new installations.
//
//go:embed site/astro.config.mjs site/bun.lock site/components.json site/package.json site/tsconfig.json site/plugins site/public site/src
var viewer embed.FS

func viewerPath(path string) (string, error) {
	if path == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		path = filepath.Join(home, "kuit")
	} else if path == "~" || strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		if path == "~" {
			path = home
		} else {
			path = filepath.Join(home, strings.TrimPrefix(path, "~/"))
		}
	}
	return filepath.Abs(path)
}

func extractViewer(target string) error {
	if err := os.MkdirAll(target, 0755); err != nil {
		return err
	}
	return fs.WalkDir(viewer, "site", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			switch path {
			case "site/src/pages/components/react", "site/src/pages/components/vue", "site/src/pages/components/svelte", "site/src/pages/components/solid":
				return fs.SkipDir
			}
		}
		if path == "site" {
			return nil
		}
		rel := strings.TrimPrefix(path, "site/")
		out := filepath.Join(target, filepath.FromSlash(rel))
		if entry.IsDir() {
			return os.MkdirAll(out, 0755)
		}
		data, err := viewer.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(out, data, 0644)
	})
}

func initViewer(args []string) error {
	if len(args) > 1 {
		return errors.New("usage: kuit init [viewer-path]")
	}
	path := ""
	if len(args) == 1 {
		path = args[0]
	}
	target, err := viewerPath(path)
	if err != nil {
		return err
	}
	if _, err = os.Lstat(target); err == nil {
		return fmt.Errorf("viewer already exists at %s", target)
	} else if !os.IsNotExist(err) {
		return err
	}
	bun, err := exec.LookPath("bun")
	if err != nil {
		return errors.New("Bun is required: install it from https://bun.sh")
	}
	if err = os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}
	stage, err := os.MkdirTemp(filepath.Dir(target), ".kuit-init-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage)
	if err = extractViewer(stage); err != nil {
		return fmt.Errorf("copy viewer: %w", err)
	}
	cmd := exec.Command(bun, "install", "--frozen-lockfile")
	cmd.Dir = stage
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if err = cmd.Run(); err != nil {
		return fmt.Errorf("install viewer dependencies: %w", err)
	}
	if _, err = os.Lstat(target); err == nil {
		return fmt.Errorf("viewer already exists at %s", target)
	} else if !os.IsNotExist(err) {
		return err
	}
	if err = os.Rename(stage, target); err != nil {
		return fmt.Errorf("place viewer: %w", err)
	}
	if err = saveTarget(target); err != nil {
		return fmt.Errorf("viewer created at %s, but saving its location failed: %w", target, err)
	}
	fmt.Println("Viewer ready. Run: kuit run")
	return nil
}

func runViewer(args []string) error {
	if len(args) != 0 {
		return errors.New("usage: kuit run")
	}
	target := os.Getenv("KUIT_TARGET")
	if target == "" {
		c, err := loadConfig()
		if err != nil {
			return err
		}
		target = c.Target
	}
	path, err := viewerPath(target)
	if err != nil {
		return err
	}
	if info, err := os.Stat(filepath.Join(path, "package.json")); err != nil || info.IsDir() {
		return fmt.Errorf("viewer not found at %s; run kuit init first", path)
	}
	bun, err := exec.LookPath("bun")
	if err != nil {
		return errors.New("Bun is required: install it from https://bun.sh")
	}
	cmd := exec.Command(bun, "run", "dev")
	cmd.Dir = path
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if err = cmd.Run(); err != nil {
		return fmt.Errorf("viewer stopped: %w", err)
	}
	return nil
}
