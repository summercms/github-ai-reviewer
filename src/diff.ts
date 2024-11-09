type File = {
  filename: string;
  status:
    | "added"
    | "removed"
    | "modified"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  previous_filename?: string;
  patch?: string;
};

export type Hunk = {
  startLine: number;
  endLine: number;
  diff: string;
};

export type FileDiff = File & {
  hunks: Hunk[];
};

export function parseFileDiff(file: File): FileDiff {
  if (!file.patch) {
    return {
      ...file,
      hunks: [],
    };
  }

  const hunks: Hunk[] = [];

  let currentHunk: Hunk | null = null;
  for (const line of file.patch.split("\n")) {
    const hunkHeader = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
    if (hunkHeader) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = {
        startLine: parseInt(hunkHeader[2]),
        endLine: parseInt(hunkHeader[2]),
        diff: line + "\n",
      };
    } else if (currentHunk) {
      currentHunk.diff += line + "\n";
      if (line[0] !== "-") {
        currentHunk.endLine++;
      }
    }
  }
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return {
    ...file,
    hunks,
  };
}

function removeDeletedLines(hunk: Hunk): Hunk {
  return {
    ...hunk,
    diff: hunk.diff
      .split("\n")
      .filter((line) => !line.startsWith("-"))
      .join("\n"),
  };
}

function removeAddedLines(hunk: Hunk): Hunk {
  return {
    ...hunk,
    diff: hunk.diff
      .split("\n")
      .filter((line) => !line.startsWith("+"))
      .join("\n"),
  };
}

function prependLineNumbers(hunk: Hunk): Hunk {
  const lines = hunk.diff.split("\n");
  let currentLine = hunk.startLine;
  const numberedLines = lines.map((line) => {
    // Skip empty lines at the end of the diff
    if (!line) return line;

    // Handle different line prefixes
    if (line.startsWith("@@")) {
      return line; // Keep hunk headers as is
    } else if (line.startsWith("-")) {
      return line; // Don't number removed lines
    } else if (line.startsWith("+")) {
      return `${currentLine++} ${line}`;
    } else {
      return `${currentLine++} ${line}`;
    }
  });

  return {
    startLine: hunk.startLine,
    endLine: hunk.endLine,
    diff: numberedLines.join("\n"),
  };
}

function formatDiffHunk(hunk: Hunk): string {
  const oldHunk = removeAddedLines(hunk);
  const newHunk = prependLineNumbers(removeDeletedLines(hunk));

  // Extract the @@ header from the first line
  const lines = hunk.diff.split("\n");
  const headerLine = lines.find((line) => line.startsWith("@@"));

  // Check if there's content in each hunk after removing lines (excluding @@ header)
  const hasOldContent = oldHunk.diff
    .trim()
    .split("\n")
    .some((line) => line && !line.startsWith("@@"));
  const hasNewContent = newHunk.diff
    .trim()
    .split("\n")
    .some((line) => line && !line.startsWith("@@"));

  let output = "";

  // Add header first if we have any content
  if ((hasOldContent || hasNewContent) && headerLine) {
    output += `${headerLine}\n`;
  }

  if (hasNewContent) {
    // Remove @@ header from new hunk content
    const newContent = newHunk.diff
      .split("\n")
      .filter((line) => !line.startsWith("@@"))
      .join("\n")
      .trimEnd();
    output += `__new hunk__\n${newContent}\n`;
  }

  if (hasOldContent) {
    if (hasNewContent) output += "\n";
    // Remove @@ header from old hunk content
    const oldContent = oldHunk.diff
      .split("\n")
      .filter((line) => !line.startsWith("@@"))
      .join("\n")
      .trimEnd();
    output += `__old hunk__\n${oldContent}\n`;
  }

  return output || "No changes in this hunk";
}

export function formatFileDiff(file: File): string {
  const diff = file.patch || "";

  let header = `## File ${file.status}: `;
  if (file.previous_filename) {
    header += `'${file.previous_filename}' → `;
  }
  header += `'${file.filename}'`;

  if (diff.length) {
    header += `\n\n${diff}`;
  }

  return header;
}

export function generateFileCodeDiff(
  fileDiff: FileDiff,
  simplified: boolean = false
): string {
  const hunksText = simplified
    ? fileDiff.patch || ""
    : fileDiff.hunks.map((hunk) => formatDiffHunk(hunk)).join("\n\n");

  let header = `## File ${fileDiff.status}: `;
  if (fileDiff.previous_filename) {
    header += `'${fileDiff.previous_filename}' → `;
  }
  header += `'${fileDiff.filename}'`;

  if (hunksText.length) {
    header += `\n\n${hunksText}`;
  }

  return header;
}
