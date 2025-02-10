/***************************************************
 * GLOBALS
 ***************************************************/

/**
 * fileDataDict[i] will be a dictionary: { [featureName]: dataValue }
 * for each uploaded file i (0..3).
 */
let fileDataDict = [{}, {}, {}, {}];

/** Keep a reference to all rows for searching/filtering */
let allTableRows = [];

/** Track whether the user actually uploaded file4 or not */
let isFile4Uploaded = false;

/***************************************************
 * MAIN LOGIC
 ***************************************************/

/**
 * Update table column headers when file is chosen
 */
function updateFileName(index) {
  const fileInput = document.getElementById(`file${index}`);
  const fileName = fileInput.files[0] ? fileInput.files[0].name : `Data ${index}`;
  document.getElementById(`file-header${index}`).innerText = fileName;
}

/**
 * Reads the uploaded files, parses them, and calls buildComparisonTable().
 */
function processFiles() {
  const files = [
    document.getElementById("file1").files[0],
    document.getElementById("file2").files[0],
    document.getElementById("file3").files[0],
    document.getElementById("file4").files[0],
  ];

  // At least three files required
  if (!files[0] || !files[1] || !files[2]) {
    alert("Please upload at least three CSV files (File1, File2, File3).");
    return;
  }

  // Check if file4 is actually uploaded
  isFile4Uploaded = !!files[3];

  // Reset data dictionaries
  fileDataDict = [{}, {}, {}, {}];

  let readFiles = 0;
  const totalFilesToRead = files.filter((f) => f).length;

  files.forEach((file, index) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        fileDataDict[index] = parseCSVtoDict(event.target.result);
        readFiles++;
        if (readFiles === totalFilesToRead) {
          buildComparisonTable();
        }
      };
      reader.readAsText(file);
    }
  });
}

/**
 * Parses CSV text (assuming it has header "Feature,Data") into an object/dict { featureName: dataValue }
 */
function parseCSVtoDict(csv) {
  const lines = csv.trim().split("\n");
  const dict = {};

  // We'll assume the first line is a header row "Feature,Data"
  // If your CSV has no headers, set startIndex = 0
  let startIndex = 0;

  for (let i = startIndex; i < lines.length; i++) {
    let [feature, value] = safeSplitCSVLine(lines[i]);
    feature = (feature || "").trim();
    value = (value || "").trim();
    if (feature) {
      dict[feature] = value;
    }
  }
  return dict;
}

/**
 * Safely split a single CSV line by commas, taking quotes into account if needed
 */
function safeSplitCSVLine(line) {
  const tokens = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if (!tokens) return ["", ""];
  return tokens.map((t) => t.replace(/^"|"$/g, "").trim());
}

/**
 * Build and compare data from up to 4 file dictionaries,
 * color-code rows, update KPIs, etc.
 *
 * Key points:
 * - Only show/compare 4th column if a 4th file was uploaded.
 * - Empty cells are always "blue" at the cell level and are
 *   treated as unique distinct values (never equal to each other).
 * - Row color logic:
 *   1) Green if all used columns have the same non-empty value.
 *   2) Red if all used columns are distinct (including empty).
 *   3) Yellow otherwise (partial).
 * - Auto-copy logic for Final Data column:
 *   - Green row => copy the single identical non-empty value.
 *   - Yellow row => copy the "most common non-empty value" among used columns.
 *     (If there's a tie, pick the first highest-frequency value encountered, left to right.)
 *   - Red row => no auto-copy (leave blank).
 */
function buildComparisonTable() {
  // Show/hide the 4th column header based on whether file4 was uploaded
  const fileHeader4 = document.getElementById("file-header4");
  if (!isFile4Uploaded) {
    fileHeader4.style.display = "none";
  } else {
    fileHeader4.style.display = "";
  }

  // Collect all unique feature names from all dictionaries
  const allFeatures = new Set();
  fileDataDict.forEach((dict) => {
    Object.keys(dict).forEach((feature) => {
      allFeatures.add(feature);
    });
  });
  // Convert to array (sorted by Feature name)
  const featureList = Array.from(allFeatures).sort();

  // Clear existing table rows
  const tableBody = document.querySelector("#data-table tbody");
  tableBody.innerHTML = "";
  allTableRows = []; // clear global reference

  // KPIs
  let sameCount = 0;
  let partialCount = 0;
  let diffCount = 0;
  let missingCellCount = 0;

  // For diff percentages (comparing File2–4 to File1)
  let diffFile2 = 0, diffFile3 = 0, diffFile4 = 0;
  let compareCount2 = 0, compareCount3 = 0, compareCount4 = 0;

  // We'll track a row index to help generate unique placeholders for empty cells
  let rowIndex = 0;

  featureList.forEach((feature) => {
    // Gather values from up to 4 files
    const rowValues = [
      fileDataDict[0][feature] || "",
      fileDataDict[1][feature] || "",
      fileDataDict[2][feature] || "",
      fileDataDict[3][feature] || "",
    ];

    // We'll consider only columns 1–3 if file4 wasn't uploaded
    const usedValues = isFile4Uploaded ? rowValues : rowValues.slice(0, 3);

    // Count missing cells
    missingCellCount += usedValues.filter((v) => v === "").length;

    // Transform each used value to a unique token if empty,
    // so that no two empty cells are ever considered equal:
    const transformedUsedValues = usedValues.map((val, colIndex) => {
      if (val === "") {
        // Insert a unique placeholder, e.g. _EMPTY_row_col
        return `_EMPTY_${rowIndex}_${colIndex}`;
      }
      return val;
    });

    // Determine row color
    // 1) Green if all used columns have the same (non-empty) value
    // 2) Red if all used columns are distinct
    // 3) Yellow otherwise (partial)
    const uniqueVals = new Set(transformedUsedValues);
    let rowColorClass = "";
    let finalValue = ""; // to auto-populate final column

    const allNonEmptyAreSame =
      uniqueVals.size === 1 &&
      !transformedUsedValues[0].startsWith("_EMPTY_");

    if (allNonEmptyAreSame) {
      // All used columns have the same non-empty string => green
      rowColorClass = "green";
      sameCount++;
      finalValue = usedValues[0]; // that single identical value
    } else if (uniqueVals.size === transformedUsedValues.length) {
      // All are distinct => red
      rowColorClass = "red";
      diffCount++;
    } else {
      // Partial => yellow
      rowColorClass = "yellow";
      partialCount++;

      // Let's pick the most common non-empty value among used columns
      // Build frequency map (skip placeholders)
      const freqMap = {};
      usedValues.forEach((val) => {
        if (val !== "") {
          freqMap[val] = (freqMap[val] || 0) + 1;
        }
      });

      if (Object.keys(freqMap).length === 0) {
        // no non-empty values => finalValue remains "", no fill
      } else {
        // we have some non-empty values, find the highest frequency
        let maxFreq = 0;
        let bestValue = "";

        // to break ties by "first in left-to-right order", we can iterate usedValues
        // and check which has the highest freq
        for (let i = 0; i < usedValues.length; i++) {
          const val = usedValues[i];
          if (val !== "" && freqMap[val] >= maxFreq) {
            maxFreq = freqMap[val];
            bestValue = val;
          }
        }
        finalValue = bestValue;
      }
    }

    // Diff percentages: compare file2–4 vs file1 if file1 is non-empty
    const valFile1 = rowValues[0];
    if (valFile1) {
      // File2
      if (rowValues[1]) {
        compareCount2++;
        if (rowValues[1] !== valFile1) diffFile2++;
      }
      // File3
      if (rowValues[2]) {
        compareCount3++;
        if (rowValues[2] !== valFile1) diffFile3++;
      }
      // File4
      if (isFile4Uploaded && rowValues[3]) {
        compareCount4++;
        if (rowValues[3] !== valFile1) diffFile4++;
      }
    }

    // Construct the actual <tr>
    const tr = document.createElement("tr");
    tr.setAttribute("data-feature", feature); // for search/filter

    // Feature cell
    const featureTd = document.createElement("td");
    featureTd.textContent = feature;
    tr.appendChild(featureTd);

    // Build columns 1–3
    for (let i = 0; i < 3; i++) {
      const td = document.createElement("td");
      td.textContent = rowValues[i];

      // Color empty cells in blue, otherwise use rowColorClass
      if (rowValues[i] === "") {
        td.classList.add("blue");
      } else {
        td.classList.add(rowColorClass);
      }
      tr.appendChild(td);
    }

    // Conditionally build column 4 if file4 is uploaded
    if (isFile4Uploaded) {
      const td4 = document.createElement("td");
      td4.textContent = rowValues[3];
      if (rowValues[3] === "") {
        td4.classList.add("blue");
      } else {
        td4.classList.add(rowColorClass);
      }
      tr.appendChild(td4);
    }

    // Final data cell (editable)
    const finalTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";

    if (rowColorClass === "green") {
      // auto-fill if all the same and non-empty
      input.value = finalValue;
      input.style.backgroundColor = "#c8e6c9"; // light green
    } else if (rowColorClass === "yellow" && finalValue !== "") {
      // auto-fill with the most common non-empty value (if any)
      input.value = finalValue;
      input.style.backgroundColor = "#fff9c4"; // light yellow
    }
    // If red => leave blank (no auto-fill)
    // If yellow but no non-empty majority => remains blank

    finalTd.appendChild(input);
    tr.appendChild(finalTd);

    tableBody.appendChild(tr);
    allTableRows.push(tr);
    rowIndex++;
  });

  // Update KPI counters
  document.getElementById("kpi-total").innerText = `Total Features: ${featureList.length}`;
  document.getElementById("kpi-same").innerText = `Same (Green): ${sameCount}`;
  document.getElementById("kpi-partial").innerText = `Partial (Yellow): ${partialCount}`;
  document.getElementById("kpi-diff").innerText = `Different (Red): ${diffCount}`;
  document.getElementById("kpi-missing").innerText = `Missing Cells: ${missingCellCount}`;

  // Calculate diff percentages
  function calcDiffPercent(dCount, cCount) {
    if (!cCount) return "0%";
    return ((dCount / cCount) * 100).toFixed(1) + "%";
  }
  document.getElementById("kpi-diff2").innerText = `File2 Diff: ${calcDiffPercent(diffFile2, compareCount2)}`;
  document.getElementById("kpi-diff3").innerText = `File3 Diff: ${calcDiffPercent(diffFile3, compareCount3)}`;
  document.getElementById("kpi-diff4").innerText = `File4 Diff: ${calcDiffPercent(diffFile4, compareCount4)}`;
}

/***************************************************
 * SEARCH / FILTER
 ***************************************************/

/**
 * Filter table rows based on the "Search Feature" input
 */
function filterFeatures() {
  const searchValue = document.getElementById("searchInput").value.toLowerCase();
  allTableRows.forEach((row) => {
    const featureName = row.getAttribute("data-feature").toLowerCase();
    // hide if it doesn't include the search text
    if (!featureName.includes(searchValue)) {
      row.style.display = "none";
    } else {
      row.style.display = "";
    }
  });
}

/***************************************************
 * ZOOM
 ***************************************************/

function zoomTable(value) {
  const tableWrapper = document.getElementById("table-scale-container");
  const scaleValue = value / 100;
  tableWrapper.style.transform = `scale(${scaleValue})`;
  // Update label
  document.getElementById("zoomValue").textContent = value + "%";
}

/***************************************************
 * DARK MODE
 ***************************************************/

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

/***************************************************
 * EXPORT
 ***************************************************/

/**
 * Export CSV containing "Feature" and the final edited column
 * File name includes current date/time
 */
function exportData() {
  let csvContent = "Feature,Final Data\n";
  document.querySelectorAll("#data-table tbody tr").forEach((row) => {
    const feature = row.cells[0].innerText;
    const finalValue = row.cells[row.cells.length - 1].querySelector("input").value;
    csvContent += `"${feature}","${finalValue}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv" });
  const a = document.createElement("a");

  // Use current date/time in file name
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
  a.download = `final_data_${timestamp}.csv`;

  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
