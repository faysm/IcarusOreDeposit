let pyodide = null;
let pyodideReady = loadPyodide().then((py) => {
    pyodide = py;
});

// Load main.py into Pyodide once at startup
async function initPyodide() {
    await pyodideReady;

    // Fetch main.py from your server and run it in Pyodide
    const mainCode = await fetch("main.py").then(r => r.text());
    await pyodide.runPythonAsync(mainCode);
}

// Initialize Pyodide and load main.py
initPyodide();

// -------------------- Grab DOM elements --------------------
const dropzone = document.getElementById("dropzone");
const output = document.getElementById("output");

// -------------------- Prevent default drag & drop anywhere --------------------
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

window.addEventListener("dragover", (e) => e.preventDefault(), false);
window.addEventListener("drop", (e) => e.preventDefault(), false);

// -------------------- Handle file drop --------------------
dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "#eef";
});

dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "";
});

dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.backgroundColor = "";

    const file = e.dataTransfer.files[0];
    if (!file) return;

    output.textContent = `Reading file: ${file.name} (${file.size} bytes)...`;

    try {
        // Wait for Pyodide to be ready
        await pyodideReady;

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Convert to Pyodide-compatible bytes
        const pyBytes = pyodide.toPy(new Uint8Array(arrayBuffer));

        // Make pyBytes available in Python globals
        pyodide.globals.set("pyBytes", pyBytes);

        // Call your Python function directly (already loaded in environment)
        const result = await pyodide.runPythonAsync(`
decompressed = process_prospect_file(pyBytes)
world, X, Y, Ressource = decompressed
(world, X, Y, Ressource)
`);

        // Delete pyBytes from globals to free memory
        pyodide.globals.delete("pyBytes");

        /*output.textContent = `Processed ${file.name} successfully!\n` +
                             `World: ${result.get(0)}\n`;
        */
        
        const world = result.get(0);
        const X = result.get(1);
        const Y = result.get(2);
        const Ressource  = result.get(3);

                                    // Display results
        output.textContent = `Processed ${file.name} successfully!\n` +
                             `World: ${world}\n`
                              ;
        
        const mapImage = document.getElementById("mapImage");
        mapImage.src = `assets/Maps/${world}.png`;
        mapImage.style.display = "none";
        mapImage.onerror = () => {
            output.textContent += `\n Map image not found for "${world}"`;
            mapImage.style.display = "none";
        };
        const mapCanvas = document.getElementById("mapCanvas");
        const ctx = mapCanvas.getContext("2d");

        mapImage.onload = async () => {
            // Set canvas size to match map
            mapCanvas.width = mapImage.naturalWidth;
            mapCanvas.height = mapImage.naturalHeight;
            const modeSwitch = document.getElementById("modeSwitch");
            const isExoticsMode = modeSwitch.checked;
            console.log("Switch Exotic mode ? : " + isExoticsMode);
            const assetNames= ['Aluminium','Clay','Coal','Copper','Frozen_Wood','Gold','Iron','Obsidian','Oxite','Platinum','Salt', 'Scoria', 'Silicon','Stone','Sulfur','Titanium','Exotic','Exotic_Red_Raw'];
        
            async function loadAssets(assetNames) {
                const assets = [];
                const promises = assetNames.map((name, i) => {
                    return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.src = `assets/Ores/${name}.png`;
                        img.onload = () => {
                            assets[i] = img;
                            resolve();
                        };
                        img.onerror = () => {
                            console.warn(`Failed to load ${name}`);
                            resolve(); // still resolve so Promise.all won't hang
                        };
                    });
                });
                await Promise.all(promises);
                return assets;
            }
            // Draw the map on the canvas
            ctx.drawImage(mapImage, 0, 0);
            const assets = await loadAssets(assetNames);
            
            for(let nb_deep_veins =0; nb_deep_veins < Ressource.length; nb_deep_veins++ ){
                
                const asset = new Image();
                const curr_ressource = Ressource.get(nb_deep_veins);
                if ((curr_ressource != 'Exotic' && curr_ressource != 'Exotic_Red_Raw') && !isExoticsMode) {
                    const width = 40;  // desired width in pixels
                    const height = 40; // desired height in pixels
                    const pos_x = X.get(nb_deep_veins);
                    const pos_y = Y.get(nb_deep_veins);
                    console.log(curr_ressource);
                    id = assetNames.indexOf(curr_ressource);
                    ctx.drawImage(assets[id], pos_x-20, pos_y-20, width, height);
                }
                if ( (curr_ressource == 'Exotic' || curr_ressource == 'Exotic_Red_Raw') && isExoticsMode){
                    const width = 80;  // desired width in pixels
                    const height = 80; // desired height in pixels
                    const pos_x = X.get(nb_deep_veins);
                    const pos_y = Y.get(nb_deep_veins);

                    id = assetNames.indexOf(curr_ressource);
                    ctx.drawImage(assets[id], pos_x-20, pos_y-20, width, height);
                }
            
            };
        };
                      
    } catch (err) {
        console.error(err);
        output.textContent = `Error processing ${file.name}: ${err}`;
    }
});