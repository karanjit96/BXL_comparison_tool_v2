# BXL CSV Comparison Tool

This project provides a tool to **compare CSV data** across up to four files. It color-codes each row based on how similar or different the CSV entries are for each feature, provides KPI metrics, a search filter, a dark mode toggle, and a mirror-like reflection effect on the data table.

## Features

1. **Compare Up to Four CSV Files**  
   - **At least three** files are required (File 1, File 2, File 3).  
   - File 4 is **optional**.

2. **Color Coding**  
   - **Green**: All non-empty values across files match  
   - **Yellow**: Partial match (some same, not all)  
   - **Red**: All are different  
   - **Blue**: Cell is empty  

3. **KPI Metrics**  
   - **Total Features**  
   - **Same / Partial / Different** row counts  
   - **Missing Cells**  
   - **Diff %** for File2–4 compared to File1  

4. **Search / Filter**  
   - Type in the search box to filter rows by Feature name.

5. **Export**  
   - Generates a CSV file containing **Feature** and **Final Data**.  
   - Final Data column is editable by the user.
