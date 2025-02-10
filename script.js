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
 * Reads the uploaded files, parses them, and calls compareData().
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
 * Build and compare data from up to 4 file dictionaries, color-code, update KPIs, etc.
 */
function buildComparisonTable() {
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

  // Build table rows
  featureList.forEach((feature) => {
    const rowValues = [
      fileDataDict[0][feature] || "",
      fileDataDict[1][feature] || "",
      fileDataDict[2][feature] || "",
      fileDataDict[3][feature] || "",
    ];

    // non-empty values
    const nonEmptyValues = rowValues.filter((v) => v !== "");
    const uniqueNonEmpty = new Set(nonEmptyValues);

    let rowColorClass = "";
    let finalValue = "";

    if (nonEmptyValues.length === 0) {
      // all empty => "blue"
      rowColorClass = "blue";
    } else if (uniqueNonEmpty.size === 1 && nonEmptyValues.length > 0) {
      // all non-empty are same => green
      rowColorClass = "green";
      sameCount++;
      finalValue = nonEmptyValues[0]; // auto-fill final column
    } else if (uniqueNonEmpty.size === nonEmptyValues.length) {
      // all are different => red
      rowColorClass = "red";
      diffCount++;
    } else {
      // partial => yellow
      rowColorClass = "yellow";
      partialCount++;
    }

    // missing cells
    missingCellCount += rowValues.filter((v) => v === "").length;

    // diff percentages: compare file2–4 vs file1 if file1 is non-empty
    const valFile1 = rowValues[0];
    if (valFile1) {
      if (rowValues[1]) {
        compareCount2++;
        if (rowValues[1] !== valFile1) diffFile2++;
      }
      if (rowValues[2]) {
        compareCount3++;
        if (rowValues[2] !== valFile1) diffFile3++;
      }
      if (rowValues[3]) {
        compareCount4++;
        if (rowValues[3] !== valFile1) diffFile4++;
      }
    }

    // Construct row
    const tr = document.createElement("tr");
    tr.setAttribute("data-feature", feature); // for search/filter

    // Feature cell
    const featureTd = document.createElement("td");
    featureTd.textContent = feature;
    tr.appendChild(featureTd);

    // 4 data cells
    for (let i = 0; i < 4; i++) {
      const td = document.createElement("td");
      td.textContent = rowValues[i];
      if (rowValues[i] === "") {
        td.classList.add("blue");
      } else {
        td.classList.add(rowColorClass);
      }
      tr.appendChild(td);
    }

    // Final data cell (editable)
    const finalTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    if (rowColorClass === "green") {
      // auto-fill
      input.value = finalValue;
      input.style.backgroundColor = "#c8e6c9"; // greenish
    }
    finalTd.appendChild(input);
    tr.appendChild(finalTd);

    tableBody.appendChild(tr);
    allTableRows.push(tr);
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

/**
 * Zoom the table by applying scale transform to #table-scale-container
 */
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
    const finalValue = row.cells[5].querySelector("input").value;
    csvContent += `"${feature}","${finalValue}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv" });
  const a = document.createElement("a");

  // Use current date/time in file name
  const now = new Date();
  // e.g. final_data_2025-02-10_16-32-55.csv
  const timestamp = now.toISOString().slice(0,19).replace("T","_").replace(/:/g,"-");
  a.download = `final_data_${timestamp}.csv`;

  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
