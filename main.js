// npx serve
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
        const text = await file.text();
        const lines = text.split(/(?<=\r?\n)/);
        // Grab the blob
        const blobline = lines.find(line => line.includes("BinaryBlob")) || null;
        if (!blobline) {
         throw new Error("No BinaryBlob found in file");
        }
        
        let blobf = blobline.substring(17, blobline.length - 2);
        //console.log(blobf);
        //For some reason, the blob still has endline characters ... 
        blobf = blobf
        .trim()                 
        .replace(/["',]/g, '')  
        .replace(/\s+/g, '');
        const decodedBinary = atob(blobf);
        const decodedBytes = new Uint8Array(decodedBinary.length);

        // Decode it
        for (let i = 0; i < decodedBinary.length; i++) {
            decodedBytes[i] = decodedBinary.charCodeAt(i);
        }

        // Step 8: Decompress binary
        const data = pako.inflate(decodedBytes);
        
        // More complicated than anticipated è_é OFC its more complicated, why would JS behave nicely.
        // Bytes are just Uint8Array in Js. Need to encode the str before searching.
        function stringToBytes(str) {
            const encoder = new TextEncoder(); // UTF-8 encoder
            return encoder.encode(str);
        }

        // Why would we have nice things. This language is horrible.
        // Lets find a needle in a haystack manually i guess.

        function indexOfSubarray(haystack, needle, fromIndex = 0) {
            const hLen = haystack.length;
            const nLen = needle.length;
            for (let i = fromIndex; i <= hLen - nLen; i++) {
                let found = true;
                for (let j = 0; j < nLen; j++) {
                    if (haystack[i + j] !== needle[j]) {
                        found = false;
                        break;
                    }
                }
                if (found) return i;
            }
            return 0;
        }

        
        let world = "Unknown";
        let map_scale = 0;
        let offset = 0;
        // Map detection
        if(indexOfSubarray(data,stringToBytes('Terrain_016'),offset)){
            world = "Olympus";
            map_scale = 4096;
        }
        if(indexOfSubarray(data,stringToBytes('Terrain_017'),offset)){
            world = "Styx";
            map_scale = 4096;
        }
        if(indexOfSubarray(data,stringToBytes('Terrain_019'),offset)){
            world = "Prometheus";
            // good job on that one icarus devs, i guess.
            map_scale = 2048;
        }

        // So far so good
        const Max_map_size_meters = 403200;
        const Min_map_size_meters = -403200;
        const scale = (Max_map_size_meters-Min_map_size_meters)/map_scale;

        let X = [];
        let Y = [];
        let Ressource = [];
        
        // Bwah there's probably a lib to read little-endian integers, but i cba 
        function readUInt32LE(bytes, offset) {
            return (
                bytes[offset] |
                (bytes[offset + 1] << 8) |
                (bytes[offset + 2] << 16) |
                (bytes[offset + 3] << 24)
            ) >>> 0;
        }

        let count = 0;
        while (offset!=0 || count ==0) {
            // Look for the bytes containing the string of our flag.
            offset = indexOfSubarray(data,stringToBytes('Script/Icarus.ResourceDepositRecorderComponent'),offset);
            if (offset){
                offset = indexOfSubarray(data,stringToBytes('NameProperty'),offset);
                // Byte shift is 12 + null + 8 + null.
                offset+=22;
                // Grab length of ressource name
                const name_len = readUInt32LE(data,offset);
                offset+=4;

                // Grab ressource name + offset
                const slice = data.subarray(offset, offset + name_len - 1);
                const decoder = new TextDecoder("utf-8", { fatal: false }); // errors are ignored
                Ressource.push(decoder.decode(slice));
                offset = indexOfSubarray(data,stringToBytes('Vector'),offset);

                // Skipping \x00'Vector'\x00 + GUID padding
                offset+=24;

                // Grab vector coordinates (3 x float32 = 12 bytes) & scale them to map pixel coordinates
                const vectorBytes = data.subarray(offset, offset + 12);
                const view = new DataView(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength);
                offset+=12;

                const x = (view.getFloat32(0, true) - Min_map_size_meters )/scale; 
                X.push(x);
                const y = map_scale - (Max_map_size_meters - view.getFloat32(4, true))/scale;
                Y.push(y);
                // z is really whatever for now, but lets stock it i guess. Keep in mind its not scaled properly.
                const z = view.getFloat32(8, true)/scale;

                count++;
            }
        }


        // Display results
        output.textContent = `Processed ${file.name} successfully!\n` +
                             `World: ${world}\n`
                              ;
        
        const mapImage = document.getElementById("mapImage");
        mapImage.src = `assets/Maps/${world}Filtered.png`;
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
                const curr_ressource = Ressource[nb_deep_veins];
                if ((curr_ressource != 'Exotic' && curr_ressource != 'Exotic_Red_Raw') && !isExoticsMode) {
                    const width = 40;  // desired width in pixels
                    const height = 40; // desired height in pixels
                    const pos_x = X[nb_deep_veins];
                    const pos_y = Y[nb_deep_veins];
                    id = assetNames.indexOf(curr_ressource);
                    ctx.drawImage(assets[id], pos_x-20, pos_y-20, width, height);
                }
                if ( (curr_ressource == 'Exotic' || curr_ressource == 'Exotic_Red_Raw') && isExoticsMode){
                    const width = 80;  // desired width in pixels
                    const height = 80; // desired height in pixels
                    const pos_x = X[nb_deep_veins];
                    const pos_y = Y[nb_deep_veins];

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