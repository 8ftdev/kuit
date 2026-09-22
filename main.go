package main

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

//go:embed helper/*.ts
var helper embed.FS

type options struct {
	Origin, Framework, Name, Target, Export, Props string
	Force, Install                                 bool
}
type config struct {
	Target string `json:"target"`
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var camelPattern = regexp.MustCompile(`([a-z0-9])([A-Z])`)
var separators = regexp.MustCompile(`[^a-z0-9]+`)

func parseImport(args []string) (options, error) {
	var o options
	var positional []string
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--force":
			o.Force = true
		case "--install":
			o.Install = true
		case "--target", "--export", "--props":
			key := args[i]
			i++
			if i >= len(args) || strings.HasPrefix(args[i], "--") {
				return o, fmt.Errorf("%s needs a value", key)
			}
			switch key {
			case "--target":
				o.Target = args[i]
			case "--export":
				o.Export = args[i]
			case "--props":
				o.Props = args[i]
			}
		default:
			if strings.HasPrefix(args[i], "-") {
				return o, fmt.Errorf("unknown flag %s", args[i])
			}
			positional = append(positional, args[i])
		}
	}
	if len(positional) < 2 || len(positional) > 3 {
		return o, errors.New("usage: kuit <origin> <react|vue|svelte|solid> [name]")
	}
	o.Origin = positional[0]
	o.Framework = positional[1]
	switch o.Framework {
	case "react", "vue", "svelte", "solid":
	default:
		return o, fmt.Errorf("unsupported framework %q", o.Framework)
	}
	if len(positional) == 3 {
		o.Name = positional[2]
	} else {
		base := strings.TrimSuffix(filepath.Base(o.Origin), filepath.Ext(o.Origin))
		o.Name = strings.Trim(separators.ReplaceAllString(strings.ToLower(camelPattern.ReplaceAllString(base, "${1}-${2}")), "-"), "-")
	}
	if len(o.Name) > 100 || !slugPattern.MatchString(o.Name) {
		return o, errors.New("name must be a lowercase slug, for example shinny-button (maximum 100 characters)")
	}
	return o, nil
}

func configPath() (string, error) {
	if override := os.Getenv("KUIT_CONFIG"); override != "" {
		return override, nil
	}
	home, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "kuit", "config.json"), nil
}
func loadConfig() (config, error) {
	var c config
	path, err := configPath()
	if err != nil {
		return c, err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return c, nil
	}
	if err != nil {
		return c, err
	}
	err = json.Unmarshal(data, &c)
	return c, err
}
func saveTarget(target string) error {
	path, err := filepath.Abs(target)
	if err != nil {
		return err
	}
	if _, err = os.Stat(filepath.Join(path, "package.json")); err != nil {
		return fmt.Errorf("target must be an initialized viewer with package.json: %w", err)
	}
	dest, err := configPath()
	if err != nil {
		return err
	}
	if err = os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
		return err
	}
	data, _ := json.MarshalIndent(config{Target: path}, "", "  ")
	tmp, err := os.CreateTemp(filepath.Dir(dest), ".kuit-config-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err = tmp.Write(append(data, '\n')); err != nil {
		tmp.Close()
		return err
	}
	if err = tmp.Close(); err != nil {
		return err
	}
	if err = os.Rename(tmp.Name(), dest); err != nil {
		return err
	}
	fmt.Println("Target:", path)
	return nil
}

const usage = `kuit — collect components into your local library

  kuit config set target <viewer-path>
  kuit config show
  kuit <origin> <react|vue|svelte|solid> [name] [flags]

Flags:
  --target <path>    Override saved destination (or set KUIT_TARGET)
  --export <name>    Select a named component export
  --props <json>     JSON object with initial preview props
  --install         Run bun install in the destination after importing
  --force           Replace an existing generated bundle and preview

Requires Bun and an initialized Kuit viewer. See README.md for setup.
`

func run(args []string) error {
	if len(args) == 0 || args[0] == "--help" || args[0] == "help" {
		fmt.Print(usage)
		return nil
	}
	if args[0] == "config" {
		if len(args) == 4 && args[1] == "set" && args[2] == "target" {
			return saveTarget(args[3])
		}
		if len(args) == 2 && args[1] == "show" {
			c, err := loadConfig()
			if err != nil {
				return err
			}
			data, _ := json.MarshalIndent(c, "", "  ")
			fmt.Println(string(data))
			return nil
		}
		return errors.New("usage: kuit config set target <viewer-path> | kuit config show")
	}
	o, err := parseImport(args)
	if err != nil {
		return err
	}
	if o.Target == "" {
		o.Target = os.Getenv("KUIT_TARGET")
	}
	if o.Target == "" {
		c, err := loadConfig()
		if err != nil {
			return err
		}
		o.Target = c.Target
	}
	if o.Target == "" {
		return errors.New("set a destination first: kuit config set target /path/to/kuit/site")
	}
	o.Target, err = filepath.Abs(o.Target)
	if err != nil {
		return err
	}
	o.Origin, err = filepath.Abs(o.Origin)
	if err != nil {
		return err
	}
	if info, err := os.Stat(o.Origin); err != nil || info.IsDir() {
		return fmt.Errorf("origin must be a readable component file: %s", o.Origin)
	}
	bun, err := exec.LookPath("bun")
	if err != nil {
		return errors.New("Bun is required: install it from https://bun.sh")
	}
	temp, err := os.MkdirTemp("", "kuit-helper-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temp)
	entries, err := helper.ReadDir("helper")
	if err != nil {
		return err
	}
	for _, entry := range entries {
		data, err := helper.ReadFile("helper/" + entry.Name())
		if err != nil {
			return err
		}
		if err = os.WriteFile(filepath.Join(temp, entry.Name()), data, 0600); err != nil {
			return err
		}
	}
	argv := []string{"run", filepath.Join(temp, "index.ts"), "--origin", o.Origin, "--framework", o.Framework, "--name", o.Name, "--target", o.Target}
	if o.Export != "" {
		argv = append(argv, "--export", o.Export)
	}
	if o.Props != "" {
		argv = append(argv, "--props", o.Props)
	}
	if o.Force {
		argv = append(argv, "--force")
	}
	cmd := exec.Command(bun, argv...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if err = cmd.Run(); err != nil {
		return fmt.Errorf("import failed: %w", err)
	}
	if o.Install {
		cmd = exec.Command(bun, "install")
		cmd.Dir = o.Target
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Stdin = os.Stdin
		if err = cmd.Run(); err != nil {
			return fmt.Errorf("component imported, but bun install failed; run it again in %s: %w", o.Target, err)
		}
	}
	return nil
}
func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "kuit:", err)
		os.Exit(1)
	}
}
