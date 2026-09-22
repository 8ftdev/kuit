package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseImport(t *testing.T) {
	opts, err := parseImport([]string{"./button.tsx", "react", "shinny-button", "--target", "/tmp/docs", "--install"})
	if err != nil {
		t.Fatal(err)
	}
	if opts.Name != "shinny-button" || opts.Framework != "react" || opts.Target != "/tmp/docs" || !opts.Install {
		t.Fatalf("unexpected options: %+v", opts)
	}
}

func TestDefaultName(t *testing.T) {
	opts, err := parseImport([]string{"./FancyButton.vue", "vue"})
	if err != nil {
		t.Fatal(err)
	}
	if opts.Name != "fancy-button" {
		t.Fatalf("got %q", opts.Name)
	}
}

func TestRejectInvalidInput(t *testing.T) {
	for _, args := range [][]string{{}, {"a.tsx", "angular"}, {"a.tsx", "react", "../escape"}, {"a.tsx", "react", "--target"}, {"a.tsx", "react", "--wat"}} {
		if _, err := parseImport(args); err == nil {
			t.Errorf("accepted %v", args)
		}
	}
}

func TestExtractViewerIncludesWorkingProjectWithoutBuildOutput(t *testing.T) {
	target := filepath.Join(t.TempDir(), "viewer")
	if err := extractViewer(target); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{
		"package.json",
		"bun.lock",
		"astro.config.mjs",
		"src/pages/index.astro",
		"src/components/react/ComponentTabs.tsx",
		"src/pages/components/[framework].astro",
	} {
		if _, err := os.Stat(filepath.Join(target, name)); err != nil {
			t.Errorf("missing viewer file %s: %v", name, err)
		}
	}
	for _, name := range []string{"node_modules", "dist", ".astro", "react/shinny-button", "src/pages/components/react/shinny-button"} {
		if _, err := os.Stat(filepath.Join(target, name)); !os.IsNotExist(err) {
			t.Errorf("unexpected generated directory %s", name)
		}
	}
}

func TestInitDoesNotOverwriteExistingDirectory(t *testing.T) {
	target := filepath.Join(t.TempDir(), "viewer")
	if err := os.Mkdir(target, 0755); err != nil {
		t.Fatal(err)
	}
	marker := filepath.Join(target, "keep.txt")
	if err := os.WriteFile(marker, []byte("mine"), 0644); err != nil {
		t.Fatal(err)
	}
	err := run([]string{"init", target})
	if err == nil || !strings.Contains(err.Error(), "already exists") {
		t.Fatalf("expected existing viewer error, got %v", err)
	}
	if data, err := os.ReadFile(marker); err != nil || string(data) != "mine" {
		t.Fatalf("existing file changed: %q, %v", data, err)
	}
}

func TestRunRequiresInitializedViewer(t *testing.T) {
	t.Setenv("KUIT_CONFIG", filepath.Join(t.TempDir(), "config.json"))
	t.Setenv("KUIT_TARGET", filepath.Join(t.TempDir(), "missing"))
	err := run([]string{"run"})
	if err == nil || !strings.Contains(err.Error(), "viewer") {
		t.Fatalf("expected missing viewer error, got %v", err)
	}
}

func TestViewerPathExpandsHome(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	for _, tc := range []struct{ input, want string }{
		{"", filepath.Join(home, "kuit")},
		{"~", home},
		{"~/", home},
	} {
		got, err := viewerPath(tc.input)
		if err != nil || got != tc.want {
			t.Fatalf("viewerPath(%q) = %q, %v; want %q", tc.input, got, err, tc.want)
		}
	}
}
