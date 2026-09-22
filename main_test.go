package main

import "testing"

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
