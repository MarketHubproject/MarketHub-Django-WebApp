import fs from "fs";
import path from "path";

describe("Chinese Character Scan", () => {
  // Regex pattern for Chinese/Han characters (Unicode range U+4E00-U+9FFF)
  const chineseCharacterRegex = /[\u4e00-\u9fff]/g;

  // File extensions to scan
  const targetExtensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".md"];

  // Directories to scan
  const scanDirectories = [
    "src",
    "i18n",
    "__tests__",
    ".", // Root directory for config files
  ];

  // Files to exclude from scanning
  const excludeFiles = [
    "node_modules",
    "android/build",
    "ios/build",
    ".git",
    "CHINESE_UNICODE_SCAN_TODO.md", // This file contains Chinese characters intentionally for documentation
    "README.md", // May contain Chinese characters in examples
    "ChineseCharacterScan.test.ts", // This test file contains Chinese characters for testing purposes
  ];

  /**
   * Recursively get all files with target extensions from directories
   */
  const getAllFiles = (
    dirPath: string,
    arrayOfFiles: string[] = []
  ): string[] => {
    try {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        // Skip excluded files/directories
        if (excludeFiles.some((exclude) => fullPath.includes(exclude))) {
          return;
        }

        if (stat.isDirectory()) {
          getAllFiles(fullPath, arrayOfFiles);
        } else if (targetExtensions.some((ext) => file.endsWith(ext))) {
          arrayOfFiles.push(fullPath);
        }
      });
    } catch (error) {
      console.warn(`Could not read directory: ${dirPath}`);
    }

    return arrayOfFiles;
  };

  /**
   * Scan a single file for Chinese characters
   */
  const scanFileForChineseCharacters = (
    filePath: string
  ): { hasChineseChars: boolean; matches: RegExpMatchArray[] } => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const matches: RegExpMatchArray[] = [];
      let match;

      // Reset regex state
      chineseCharacterRegex.lastIndex = 0;

      while ((match = chineseCharacterRegex.exec(content)) !== null) {
        matches.push(match);
      }

      return {
        hasChineseChars: matches.length > 0,
        matches,
      };
    } catch (error) {
      console.warn(`Could not read file: ${filePath}`);
      return { hasChineseChars: false, matches: [] };
    }
  };

  describe("Source Files Chinese Character Scan", () => {
    let allFiles: string[] = [];

    beforeAll(() => {
      // Get all files from scan directories
      scanDirectories.forEach((dir) => {
        if (fs.existsSync(dir)) {
          allFiles = [...allFiles, ...getAllFiles(dir)];
        }
      });
    });

    it("should not contain Chinese characters in any source files", () => {
      const filesWithChineseChars: Array<{
        file: string;
        matches: RegExpMatchArray[];
      }> = [];

      allFiles.forEach((file) => {
        const result = scanFileForChineseCharacters(file);
        if (result.hasChineseChars) {
          filesWithChineseChars.push({
            file,
            matches: result.matches,
          });
        }
      });

      // If any files contain Chinese characters, fail the test with details
      if (filesWithChineseChars.length > 0) {
        const errorMessage = filesWithChineseChars
          .map(({ file, matches }) => {
            const matchDetails = matches
              .map(
                (match, index) =>
                  `  Match ${index + 1}: "${match[0]}" at position ${
                    match.index
                  }`
              )
              .join("\n");
            return `\n${file}:\n${matchDetails}`;
          })
          .join("\n");

        throw new Error(
          `Found Chinese characters in ${filesWithChineseChars.length} file(s):${errorMessage}`
        );
      }

      // Test passes if no files contain Chinese characters
      expect(filesWithChineseChars).toHaveLength(0);
    });

    it("should scan at least some files", () => {
      expect(allFiles.length).toBeGreaterThan(0);
    });

    it("should include key source directories in scan", () => {
      const srcFiles = allFiles.filter((file) => file.includes("src"));
      const i18nFiles = allFiles.filter((file) => file.includes("i18n"));

      expect(srcFiles.length).toBeGreaterThan(0);
      expect(i18nFiles.length).toBeGreaterThan(0);
    });
  });

  describe("I18n Translation Files", () => {
    it("should have English translations file", () => {
      const enTranslationsPath = path.join("i18n", "en.json");
      expect(fs.existsSync(enTranslationsPath)).toBe(true);
    });

    it("should not contain Chinese characters in translation files", () => {
      const i18nDir = "i18n";
      if (!fs.existsSync(i18nDir)) {
        return; // Skip if i18n directory doesn't exist
      }

      const translationFiles = getAllFiles(i18nDir);
      const filesWithChineseChars: Array<{
        file: string;
        matches: RegExpMatchArray[];
      }> = [];

      translationFiles.forEach((file) => {
        const result = scanFileForChineseCharacters(file);
        if (result.hasChineseChars) {
          filesWithChineseChars.push({
            file,
            matches: result.matches,
          });
        }
      });

      if (filesWithChineseChars.length > 0) {
        const errorMessage = filesWithChineseChars
          .map(({ file, matches }) => {
            const matchDetails = matches
              .map(
                (match, index) =>
                  `  Match ${index + 1}: "${match[0]}" at position ${
                    match.index
                  }`
              )
              .join("\n");
            return `\n${file}:\n${matchDetails}`;
          })
          .join("\n");

        throw new Error(
          `Found Chinese characters in translation file(s):${errorMessage}`
        );
      }

      expect(filesWithChineseChars).toHaveLength(0);
    });
  });

  describe("Test Coverage", () => {
    it("should use correct Chinese character regex pattern", () => {
      // Test the regex with known Chinese characters
      expect("你好".match(chineseCharacterRegex)).toBeTruthy();
      expect("世界".match(chineseCharacterRegex)).toBeTruthy();
      expect("Hello World".match(chineseCharacterRegex)).toBeFalsy();
      expect("123 ABC".match(chineseCharacterRegex)).toBeFalsy();
    });

    it("should properly exclude certain files from scanning", () => {
      const testFilePath = path.join("node_modules", "some-file.js");
      const shouldExclude = excludeFiles.some((exclude) =>
        testFilePath.includes(exclude)
      );
      expect(shouldExclude).toBe(true);
    });
  });
});
