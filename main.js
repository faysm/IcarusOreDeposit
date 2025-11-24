// npx serve
// -------------------- Grab DOM elements --------------------
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
/**@type {import('leaflet').Map} */
let map;

// -------------------- Prevent default drag & drop anywhere --------------------
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

window.addEventListener("dragover", (e) => e.preventDefault(), false);
window.addEventListener("drop", (e) => e.preventDefault(), false);


async function handleFile(file) {
    output.textContent = `Reading file: ${file.name} (${file.size} bytes)...`;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const bom = new Uint8Array(arrayBuffer.slice(0, 2));
        let text;
        if (bom[0] === 0xFF && bom[1] === 0xFE) {
            // UTF-16 Little-Endian bytes
            //console.log("UTF-16 LE");
            text = new TextDecoder("utf-16le").decode(arrayBuffer);
        } else if (bom[0] === 0xFE && bom[1] === 0xFF) {
            // UTF-16 Big-Endian bytes
            //console.log("UTF-16 BE");
            text = new TextDecoder("utf-16be").decode(arrayBuffer);
        } else {
            // Assume UTF-8
            text = new TextDecoder("utf-8").decode(arrayBuffer);
        }

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

        function lastIndexOfSubarray(haystack, needle, fromIndex) {
            const hLen = haystack.length;
            const nLen = needle.length;

            // Clamp fromIndex if needed
            if (fromIndex > hLen - nLen) {
                fromIndex = hLen - nLen;
            }

            for (let i = fromIndex; i >= 0; i--) {
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
        let exoticPossibleSpawn;
        let geyserSpawnLocationsPixel;

        // Lazy loading of the POI coordinates, but i believe it's more efficient than an async func to load them. Plus i need them all in memory. Subject to change.
        // Map detection
        if (indexOfSubarray(data, stringToBytes('Terrain_016'), offset)) {
            world = "Olympus";
            map_scale = 4096;
            exoticPossibleSpawn = [[-338159.44, -338404.12, -182460, -190560.97, -220970.16, -27982.557, -21137.373, -200200.36, -175948.31, -214064.25, -69629.83, -39750.02, -332596.8, -299883.16, -332329.66, -91298.46, -72980.99, -298678.2, -64563.633, -88040.91, -281298.47, -140986.14, -105811.94, -330793.06, -299474.97, -262596.6, -89547.414, -78257.83, -298004.44, -56122.312, -79987.01, -84243.41, -26368.771, -50003.215, -312912.47, -63327.18, -72897.37, -282814.25, -312703.03, -251290.7, -228517.78, -198183.08, 211135.47, 325387.5, 165119.38, 208577.67, 122534.83, 258603.05, 169648.12, 226885.69, 270609.06, 242087.98, 177454.66, 227859.2, 346247.56, 169362.31, 209249.55, 179069.6, 254712.7, 240054.64, 158606.83, 259419.7, 183082.88, 330072.88, 298607.28, 156494.56, 260683.73, 310070.3, 202745.39, 299688.6, 164208.47, 123328.92, 98112.89, 31021.264, 153410.52, 148963.66, -159573.5, -190903.03, -220530.58, -22745.223, -38419.176, -98882.01, -87179.984, -16237.921, -199485.86, -352647.84, -277879, -75615.02, -175796.77, -306625, -208055.98, -211645.42, -68240.875, -235784.53, -341023.6, -332116.78, -17063.705, 940.0449, -25936.578, -153604.62, -104362.77, -97212.27, -110898.95, -129031.32, -140937.25, -96048.93, -284761.72, -276462.94, 5084.323, 40694.793, 163134.95, 150522.9, 109981.49, 225932.2, 8617.734, 252553.73, 221920.6, 187461.2, 319936.22, 23060.48, 62235.188, 49480.395, 54034.535, 103876.27, 99391.9, 284186.47, 230084.89, 201763.53, 71894.99, 71364.76, 311105.8, 158897.94, 267613.88, 225093.12, 227389.72, 353300.9, 137255.55, 342648.88, 156738.67, 326362.44, 359054.88, 265360.22],
            [321889.6, 246921.14, 249395.52, 269525.4, 324229.25, 260954.14, 286497.12, 28804.586, 182133.89, 178921.5, 54744.977, 290626.47, 243292.2, 219456.88, 221614.81, 271058.16, 336469.12, 258300.28, 35684.863, 282038.62, 63834.668, 300959.9, 307999.1, 174868.53, 192852.69, 322565.88, 240118.22, 241604.48, 292292.4, 19894.863, 78764.945, 299880.94, 86136.75, 268974.47, 119480.9, 85596.37, 318712.88, 112484.766, 56246.84, 115932.25, 132037.39, 145572.34, -315808.3, -149805.19, -226339.92, -192690.66, -54755.734, -64717.617, -71188.42, -98072.38, -155037.75, -110759.74, -215509.23, -272804, -118058.79, -134860.73, -271731.84, -166492.1, -201715.14, -204803.11, -256664.67, -138784.45, -234557.58, -98814.84, -139733.1, -71756.65, -182226.02, -269988.38, -36657.242, -296235.88, -114418.3, -183368.45, -252027.77, -117300.79, -331606.56, -177612.55, -296603.38, -300362.97, -129218.88, -21054.238, -34417.664, -229397.06, -75922.72, -79373.305, -191487.58, -287866.28, -199070.36, -91602.01, -299976.53, -276278.9, -78874.305, -168339.83, -266564.44, -323395.6, -108218.87, -346748.78, -119051.625, -151011.08, -320077.25, -295098.6, -89354.48, -167060.92, -299091.88, -239382.08, -188876.86, -320971.03, -171874.72, -146219.69, 129007.375, 121399.56, 163053.78, 255767.84, 83122.73, 183156.27, 92774.03, 261802.06, 76923.79, 150829.5, 99128.25, 224036.42, 153704.03, 265216.47, 317417.8, 268569.7, 289146.25, 328913.03, 273543.72, 254577.78, 65053.883, 336228.84, 303085.94, 44892.3, 76547.05, 125276.45, 93067.12, 213767.9, 140212.25, 34771.11, 226955.36, 153865, 115753.766, 189416.97]]
            geyserSpawnLocationsPixel = [[3577.8920634920637, 3284.8412444444443, 1389.2863492063493, 2099.1668266666666, 3486.8650666666667, 592.69688888888891, 1167.4049015873015, 1982.2692876190476, 2631.14046984127, 3253.7488761904765, 2417.134425396825, 2248.9965866666666, 1663.695238095238, 2175.2132571428569, 1691.8081015873015, 1205.0375619047618, 795.511873015873, 963.02029206349209, 2239.9482514285714, 3680.5490793650793, 2980.9980952380952, 1279.7950984126985, 2654.9514158730158],
            [3007.6353015873019, 3583.8966857142855, 994.37633015873007, 1465.0217853968252, 826.18869841269861, 1068.2106920634919, 437.9885714285715, 564.37953015873018, 692.63126349206368, 1740.9363504761905, 3565.5633269841273, 2574.096965079365, 2161.7712253968257, 3256.7292952380949, 3622.9777777777776, 3658.9142857142856, 3429.6118857142856, 2895.9555555555553, 3432.397003174603, 2420.2754031746031, 2868.24126984127, 3001.9645460317461, 3475.0523936507934]];
        }
        if (indexOfSubarray(data, stringToBytes('Terrain_017'), offset)) {
            world = "Styx";
            map_scale = 4096;
            exoticPossibleSpawn = [[-292752.5, -195237.55, 48893.004, 29430.586, 22282.086, 23750.355, 54281.957, -38184.58, 194.84082, -36191.72, -70485.08, -93022.56, -93552.484, -382.36182, -138782.95, -139671.42, -153892, -180160.55, -162849.97, -163174.97, -186999.9, 19985.057, -132405.83, -196782.98, -345500.12, -158831.23, -149581.42, -316878.03, -280832.03, -373937.44, -249218.86, -232580.34, -59559.53, -174584.3, -105474.89, 11636.662, -110289.51, 73916.49, 77553.875, 78871.18, 69144.81, 102597.12, 177597.11, -86864.67, -62651.758, -48446.594, 45396.707, 2387.7227, 100631.914, 95968.78, 97469.234, 59294.523, 153236.89, 116467.83, 224233.34, 244131.36, 219621.73, 297194.47, 207090.69, 275300.22, -91191.78, 319260.2, 9460.647, 259046.14, 172521.75, 126150.82, 172962.36, 152422.23, 67675.2, 18512.531, 347413.38, -46389.75, 280344.72, 41238.01, 263075.1, 223578.86, 258961.14, 317190, 333990.7, 38981.875, 156735.1, 55322.79, 37356.695, 103240.516, 45559.934, 6794.799, 19525.596, -46756.645, 118371.234, 84594.625, 109710.44, 122360.125, -305972.4, -287703.1, -116388.85, -126106.42, -130426.52, -241810.47, -196204.02, -153695.3, -284707, -171783.17, -161089.9, -228584.61, -355362.5, -149204.28, -120204.51, -61248.547, -65589.8, -48107.84, -109364.14, -84941.914, -174444, -260013.38, -342533.9, -335758.3, -146696.55, -313652.16, -244330.47, -200518.38, -358688.7, -351853.7, -137728.61, -259327.98, -293221.6, -177965.9, -315404.97, -216029.72, -356456.78, -357558.22, -369342.22, -326892.2, -302192.9, -324456, -265355.16, -256221.11, -179985.56, -161938.03, 361033.72, 356872.6, 251459.11, 303312.38, 259786.95, 365694.4, 245569.2, 186940.1, 190231.84, 342423.34, 356205.56, 278395.3, 311246.8, 164030.5, 264576.38, 148438.3, 320576.47, 266056.3, 198898.7, 295607, 128181.75, 240591.39, 247797.08, 121252.54, 130581.25],
            [34093.6, 99113.75, 116438.914, 135597.69, 127101.125, 115604.27, 156026.42, 223844.9, 274423.5, 347001.22, 354471.44, 304526.34, 210376.47, 178219.11, 266563.8, 220139.19, 231533.69, 225367.55, 197184.11, 155954.67, 323200.75, 314976.47, 28721.615, 220701.73, 190199.36, 18721.65, -4567.8213, 255656.86, 220578.28, 54090.277, 157472.97, 42281.99, 275628.38, 186810.31, 17396.025, 197741.53, 334838.8, 155344.4, 131370.77, -56962.035, -59699.523, -198211.75, -270166.84, -12755.892, -316162.5, -355568.2, -348096.06, -289628.9, -294605.1, -257995.23, -359971.72, -62255.223, -323772.84, -319109.4, -309059.44, -335158.25, -360847.44, -209018.11, -188672.69, -197785.2, -86441.5, -149395.11, -173530.86, -132081.3, -146651.53, -31648.848, 50651.2, 126546.08, 61697.85, -2901.6792, -66407.08, -7262.834, -64001.918, -189871.11, 892.10034, -66691.8, -45165.58, -76532.9, -18017.836, -312342.34, -225449.39, -144618.81, -100979.09, -154996.03, -101602.234, -64224.152, -63413.633, -67276.47, -103352.07, -217374.28, -227144.16, -173162.33, -82181.58, -44462.426, -298223.22, -360279.22, -322524.97, -78163.5, -61180.688, -85598.56, -115063.81, -126073.96, -138340.14, -281259.9, -88028.836, -215889.28, -134462.11, -154282.62, -188347.56, -252325.52, -167318.47, -219582.7, -220795, -185812.88, -122929.73, -224023.47, -272734.5, -145016.61, -87768.52, -299974.28, -246986.36, -211053.22, -287517.44, -150782.88, -24907.84, -321499.1, -239629.27, -359683.88, -295871.7, -166719.39, -106988.85, -94848.38, -357509.53, -291146.16, -277330.47, -359355.38, -361660.94, -305648.03, 31043.271, 273513.9, 306549.6, 130562.375, 161812.78, 165602.69, 43665.902, 301136.4, 250236.27, 223063.47, 116211.16, 178197.45, 317478.22, 232219.52, 262123.3, 275921.5, 49347.617, 194038.08, 322636.12, 195494.92, 287700.1, 287523.72, 106955.2, 302229.38, 234500.4]];
            geyserSpawnLocationsPixel = [[1461.8380190476189, 1343.8266920634921, 2040.3322631111112, 2334.8916673015874, 2240.354031746032, 2719.9038984126983, 1604.3545904761904, 731.84777142857138, 514.42397460317443, 893.41373968253959, 3471.3178412698412, 1769.2762717460319, 1127.9819174603174, 509.83476825396809, 231.7633015873017, 3618.0828444444446, 3568.7476825396825, 2865.14753015873, 2322.836347936508, 1574.5539555555556, 1335.8034285714284, 1279.7950984126985, 2654.9514158730158],
            [2694.6107123809525, 2215.6824025396827, 1621.7591365079365, 1192.0557206349204, 536.62679365079384, 329.76172698412756, 370.40126984126982, 288.13013333333311, 725.191415873016, 1782.4265142857143, 3101.3455238095239, 1168.2621968253966, 974.16645079365071, 2187.6563504761907, 1365.7065142857141, 1786.8860444444445, 1158.9690412698415, 1604.7594158730158, 2780.2374603174603, 3691.3739682539681, 3226.9536507936509, 3001.9645460317461, 3475.0523936507934]]
        }
        if (indexOfSubarray(data, stringToBytes('Terrain_019'), offset)) {
            world = "Prometheus";
            // good job on that one icarus devs, i guess.
            map_scale = 2048;
            exoticPossibleSpawn = [[-243830.98, -254395.83, -154347.69, -232801.12, -298655.2, -64092.562, -363434.5, -344246.47, -323866.7, -342423.06, -333834.62, -280208.7, -314626.06, -302844.62, -333892.3, -343327.5, -268147.4, -300609.88, -278624.9, -266603.6, -252676.48, -246978.06, -203536.31, -171274.81, -207434.25, -224978.67, -199457.8, -274609.8, -332823.56, -326391.22, -256979.64, -235927.45, -165620.7, -324594.03, -123630.3, -317324.8, -270264.47, -114097.55, -219023.55, -199638.25, -156657.53, -205995.36, -120874.84, -177836.08, -262595.2, -170572.45, -67390.586, -97089.01, 39780.88, -114447.51, 22758.363, -83569.016, -101540.13, -34351.57, 46240.668, -29375.041, -144827.89, 9673.719, 85459.72, 66070.82, -7825.564, -143628.69, 10732.411, -122422.92, -17339.467, -103569.92, -19082.459, -40037.305, -75745.55, -86803.04, -8274.635, -47.58618, -48248.496, 38903.008, 37090.6, 20440.861, -39886.254, 60607.555, 1295.6053, 41188.91, -18500.18, 85160.984, -74405.67, -93491.79, -151014.33, 101100.52, 333549.12, 101313.484, 367892.56, 316234.47, 159856.66, 139162.9, 208725.8, 35005.594, 111543.164, 175174.58, 148985.36, 224019.12, 165571.55, 57917.22, 241436.38, 71003.81, 137600.33, 37563.465, 1115.4248, 105770.266, 114904.64, 170598.44, 71714.69, 110337.12, 247664.38, 209617.22, 386341.8, 162156.89, 157020.47, 194076.45, 188430.12, 110262.19, 49208.7, 151321.89, 211219.2, 206863.72, 171992.27, 343512.16, 193811.55, 84458.74, 86442.016, 102956.02, 161765.28, 276270.1, 216924.33, 309015.22, 219037.95, 256794.73, 232330.86, 221401.8, 370007.16, 300575.28, 314816.9, 378215.9, 245086.62, 247946.25, 267094.03, 373336.8, 277381.44, 40644.316, 24510.125, 33210.223, 305126.12, 188731.64, 342872.97, 266621.5, 219135.7, 86793.24, 214835.39, 218162.34, 193952.92, 126200.03, 345563.56, 339610.9, 292331.88, 114920.43, 333144.66, 332039.28, 358821.84, 222384.31, 175743.03, 189157.94, 147545.61, 260953.42, 301209.47, 204490.9, 333017.53, 393574.44, 368777.66, 321783.16, 280723.1, 205533.77, 144794.06, 147831.8, 273725.47, 376199.4, 344603.78, 113867.055, 198587.12, -213551.25, -225924.1, 2177.034, 85028.25, 86298.32, -222176.22, 84680.016, -44512.395, -20474.285, -3013.931, -102205.69, -113334.46, -178039.84, -130300.8, -62091.594, -14272.155, -71312.41, -32787.715, 22202.734, 63176.66, 79175.836, -102640.97, -151986.83, -179633, -86733.51, -129494.375, -187351.86, -147312.69, 32082.86, -78030.36, 67340.555, -167187.12, 17741.996, -9812.277, -22925.48, -31540.389, -42756.87, 57024.016, -13085.866, 97963.25, 5072.071, 13394.254, -29020.371, -97711.164, -80738.4, -26777.309, -126706],
            [-323836.6, -168459.86, 13954.307, -259411.94, -168637.84, -265392.56, -149583.95, -73823.48, -319986.97, -293744.2, -294568.9, -141790.84, -89656.13, -74344.47, -312703.84, -39010.72, -200672.1, -51688.953, -37168.668, 29181.61, 30259.236, 58882.523, -2421.6826, 25325.066, 98177.086, -43489.797, -11622.246, -106307.55, -196700.31, -202386.42, -64244.473, -166533.78, -57589.133, -250653.77, -310511.44, -317839.9, -325205.56, -57824.906, -347709.4, -261146.08, -332192.25, -248528.55, -37505.125, -186543.6, -84391.99, -137439.22, -315033.1, -334438.25, -163282.3, 3558.8076, 67881.8, -6284.374, 46412.418, 23216.578, 49957.21, 68232.09, 26576.572, -264261.53, -96321.89, -83752.1, -250203.02, 60666.363, -238604.16, -105676.53, 26141.973, 30620.648, -285061.5, -284994.78, -32276.594, -33513.695, -181861.33, -164176.19, -54228.797, -194282.19, -151931.4, -124562.31, 10223.187, -141380.94, 16272.407, -185393.77, -210124.64, -66505.04, 74935.28, -230096.11, -155981.72, -4825.1377, -221224.61, -118489.52, -125565.94, -115090.7, -290702.34, -266031.75, -363311.3, -357614.4, -373675.4, -331507.88, -308406.75, -225970.75, -311312.75, -335433.34, -178113.12, -349650.53, -319186.94, -283380.28, -318859, -352864.22, -329930.88, -112255.82, -205605.23, -237107.47, -232127.27, -218466.02, -157990.56, -224515.08, -54581.336, -80793.13, -138119.81, -54145.703, -306774.1, -229657.58, -302810.97, -200096.45, -165125.14, -302559.9, -167227.14, -132749.4, -152436.19, -228052.48, -101751.73, -354584.84, -293253.47, -291208.12, -345438.94, -301808.66, -369068.25, -379185.75, -246758.86, -261212.03, -322811.4, -199265.67, -278229.53, -328381.8, -232375.77, -141674.44, -168221.08, -246364.92, -259019.38, -259129.45, -191799.98, -288175.06, -150218.73, -213484.47, -199427.16, -253580.23, -400942.8, -148231.03, -346207.47, 213851.75, 229717.94, 225898.39, 65707.77, 142887.77, -100030.945, -97186.75, -61482.246, -126215.82, -20753.445, -16308.151, -2251.0652, -30792.4, -47491.742, 59856.37, 86892.29, 63268.39, 202991.6, 160290.42, 183720.39, 151569.47, 151247.98, 246764.06, 225277.28, 85984.984, 187127.47, 149772.83, -34501.105, 135628.98, 135399.83, 100482.72, 160333.88, 197525.75, 131222.55, 217038.12, 218663.56, 146609.56, 121090.03, 165691.95, 263021.6, 175880.92, 251295.86, 231598.28, 229110.16, 249913.39, 386282.3, 369295.9, 314282.78, 273731.5, 375903.5, 350043.78, 325914.62, 200936.06, 204823.95, 237831.17, 156592.3, 107547.73, 158118.27, 198545.23, 218812.36, 261010.12, 325835.94, 299154.97, 313666.12, 158362.89, 264951.94, 190025.92, 120343.71, 253379.84, 85412.9, 241026.19, 255665.7, 229846.11, 113584.48, 107440.53]];
            geyserSpawnLocationsPixel = [[344.13594920634927, 717.5866666666667, 687.15837460317459, 1448.8542984126984, 1344.9637333333333, 1370.931911111111, 1325.9701333333333, 1340.5202539682539, 1334.9425396825397, 1282.7913295238095, 935.78437587301585, 1124.4481955555557, 906.58392380952375, 777.52187936507937, 1001.4247466666667, 1011.5987936507937, 927.04764444444447, 820.50250158730159, 682.86554920634921, 808.85210412698416, 565.64393650793647, 414.494526984127, 250.0619682539683, 349.58958730158736, 195.831873015873, 434.53333333333336, 490.5033650793651, 227.59634285714284, 655.05955555555556],
            [374.76777142857168, 214.2259555555554, 454.70948571428562, 539.74504126984129, 492.14534603174593, 656.87187301587323, 819.13815873015869, 759.20027936507927, 696.93716825396837, 584.2992507936508, 855.35914666666667, 961.84820317460321, 678.36939682539673, 568.3318603174605, 382.00507936507938, 1172.5757968253968, 1226.23713015873, 1104.2437307936507, 1116.8534907936507, 1162.6201092063493, 846.06697142857138, 750.4497523809523, 738.60720253968248, 1000.6637790476191, 911.77911619047609, 1070.9744457142858, 1161.4832152380952, 437.16495238095217, 858.57930158730142]];
        }

        // So far so good
        const Max_map_size_meters = 403200;
        const Min_map_size_meters = -403200;
        const scale = (Max_map_size_meters - Min_map_size_meters) / map_scale;

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


        const flags = [
            'Script/Icarus.ResourceDeposit',
            'VoxelActorLocation'
        ];
        let skipLengths = [29, 18];
        if (world == "Prometheus") {
            flags.push('Terrain_019_DLC/Terrain_019.Terrain_019:PersistentLevel.BP_Exotic_Plant_C');
            skipLengths.push(73);
        }


        let flagNeedupdateArray = [];
        let offsetArray = [];
        for (let i = 0; i < flags.length; i++) {
            flagNeedupdateArray.push(1);
            offsetArray.push(1);
        }

        let X_voxel = [];
        let Y_voxel = [];
        let X_strangePlant = [];
        let Y_strangePlant = [];

        flagNeedupdateArray.some

        // I feel like this is more complicated than it should be. I want to minimise the calls to indexOfSubarray as much as possible (expensiveish).
        // So i want the offset to move linearly through the bytes blob and not jump left & right.
        // For now i'm using flags so it's probably the most efficient, but it's really not the smartest, and it's somewhat hard to read/navigate.
        while (flagNeedupdateArray.some(v => v)) {

            // update all flags
            for (let i = 0; i < flagNeedupdateArray.length; i++) {
                if (flagNeedupdateArray[i]) {
                    offsetArray[i] = indexOfSubarray(data, stringToBytes(flags[i]), offset);
                }
                flagNeedupdateArray[i] = 0;
            }


            // Find next smallest non-zero offset & grab the flag index
            let nextIndex = -1;
            let nextOffset = Infinity;
            for (let i = 0; i < offsetArray.length; i++) {
                if (offsetArray[i] !== 0 && offsetArray[i] < nextOffset) {
                    nextOffset = offsetArray[i];
                    nextIndex = i;
                }
            }

            if (nextIndex === -1) {
                break;
            }

            // Update the current: offset,flag, offsetskip
            offset = nextOffset;
            let flag = flags[nextIndex];
            offset += skipLengths[nextIndex];
            flagNeedupdateArray[nextIndex] = 1;

            // Deep ore veins
            if (flag == flags[0]) {

                offset = indexOfSubarray(data, stringToBytes('NameProperty'), offset);
                // Byte shift is 12 + null + 8 + null.
                offset += 22;
                // Grab length of ressource name
                const name_len = readUInt32LE(data, offset);
                offset += 4;

                // Grab ressource name + offset
                const slice = data.subarray(offset, offset + name_len - 1);
                const decoder = new TextDecoder("utf-8", { fatal: false }); // errors are ignored
                Ressource.push(decoder.decode(slice));
                offset = indexOfSubarray(data, stringToBytes('Vector'), offset);

                // Skipping \x00'Vector'\x00 + GUID padding
                offset += 24;

                // Grab vector coordinates (3 x float32 = 12 bytes) & scale them to map pixel coordinates
                const vectorBytes = data.subarray(offset, offset + 12);
                const view = new DataView(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength);
                offset += 12;

                const x = (view.getFloat32(0, true) - Min_map_size_meters) / scale;
                X.push(x);
                const y = map_scale - (Max_map_size_meters - view.getFloat32(4, true)) / scale;
                Y.push(y);
                // z is really whatever for now, but lets stock it i guess. Keep in mind its not scaled properly.
                const z = view.getFloat32(8, true) / scale;

            }

            // Exotic voxels
            if (flag == flags[1]) {

                offset = indexOfSubarray(data, stringToBytes('Vector'), offset);
                offset += 24;

                const vectorBytes = data.subarray(offset, offset + 12);
                const view = new DataView(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength);
                offset += 12;
                X_voxel.push(view.getFloat32(0, true));
                Y_voxel.push(view.getFloat32(4, true));

            }


            // Exotic plants.
            if (world == "Prometheus") {

                if (flag == flags[2]) {
                    // For exotic plants the logic is a bit different, need a new indexOfSubarray function to move backward & not forward (location bytes are before the flag).
                    // It also means that i need to use a temp offset to avoid going backward & trigger the forward flag[2] on repeat.
                    let offsettmp = lastIndexOfSubarray(data, stringToBytes('Translation'), offset);
                    offsettmp = indexOfSubarray(data, stringToBytes('Vector'), offsettmp);
                    offsettmp += 24;
                    const vectorBytes = data.subarray(offsettmp, offsettmp + 12);
                    const view = new DataView(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength);
                    X_strangePlant.push(view.getFloat32(0, true));
                    Y_strangePlant.push(view.getFloat32(4, true));
                }
            }

        }
        // console.log(Ressource);
        // Display results
        output.textContent = `Processed ${file.name} successfully!\n` +
            `World: ${world}\n`;

        const assetNames = ['Aluminium', 'Clay', 'Coal', 'Copper', 'Frozen_Wood', 'Gold', 'Iron', 'Obsidian', 'Oxite', 'Platinum', 'Salt', 'Scoria', 'Silicon', 'Stone', 'Sulfur', 'Titanium', 'Exotic', 'Exotic_Red_Raw', 'Super_Cooled_Ice'];
        // search needle to add: PersistentLevel.BP_Exotic_Plant_C
        const fixedassetNames = ['VoxelExotic'];
        if (world == "Prometheus") {
            fixedassetNames.push("ExoticSeed");
        }

        async function loadAssets(assetNames, folder = 'Ores') {
            const assets = [];
            const promises = assetNames.map((name, i) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = `assets/${folder}/${name}.png`;  // folder is dynamic
                    img.onload = () => {
                        assets[i] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load ${name} from ${folder}`);
                        resolve(); // resolve even on error
                    };
                });
            });
            await Promise.all(promises);
            return assets;
        }


        // Leaflet stuff, i guess
        if (map) {
            map.remove(); // destroy old map
        }

        const imgWidth = map_scale;
        const imgHeight = map_scale;
        //console.log(map_scale);

        map = L.map('map', {
            crs: L.CRS.Simple, // Simple coordinate system for non-geographical maps
            minZoom: -2,
            maxBounds: [[-0.1 * map_scale, -0.1 * map_scale], [map_scale * 1.1, map_scale * 1.1]],
            maxBoundsViscosity: 1.0
        });

        const bounds = [[0, 0], [imgHeight, imgWidth]]; // [top-left, bottom-right] in pixels
        const imageLayer = L.imageOverlay(`assets/Maps/${world}Filtered.png`, bounds);
        const imageLayerNullSector = L.imageOverlay(`assets/Maps/${world}FilteredNull.png`, bounds);

        imageLayer.addTo(map);
        let curveX;
        let curveY;

        let initialZoom = 0;
        if (world == "Prometheus") {
            initialZoom = 1;
            // This is probably the most efficient way to do it, ever.
            curveX = [1, 866, 1037, 1294, 1408, 1539, 1556, 1768, 1889, 1973, 2048];
            curveY = [1404, 1404, 1291, 1126, 949, 831, 680, 672, 716, 690, 690];
        }

        function InNullsector(x, y) {
            for (let i = 0; i < curveX.length - 1; i++) {
                if (x >= curveX[i] && x <= curveX[i + 1]) {
                    // linear interpolation
                    const t = (x - curveX[i]) / (curveX[i + 1] - curveX[i]);
                    return y > curveY[i] + t * (curveY[i + 1] - curveY[i]);
                }
            }
        }
        map.fitBounds(bounds);
        map.setZoom(map.getZoom() + initialZoom);

        
        // Lets make a grid ... I guess.
        const gridLayer = L.layerGroup();
        const rows = 16;
        const cols = 16;
        const cellWidth = map_scale / cols;
        const cellHeight = map_scale / rows;

        const letters = 'ABCDEFGHIJKLMNOP';

        const allLines = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                L.polyline([[0, c * cellWidth], [map_scale, c * cellWidth]], { color: 'grey', weight: 1, opacity: 0.7 }).addTo(gridLayer);
                L.polyline([[r * cellHeight, 0], [r * cellHeight, map_scale]], { color: 'grey', weight: 1, opacity: 0.7 }).addTo(gridLayer);

                // Add coordinate label (top-left of each cell)
                const label = letters[c] + (16 - (r)); // e.g., A1, B3
                L.marker([(r + 1) * cellHeight - 0.05 * cellHeight, (c * cellWidth) + cellWidth * 0.05], {
                    icon: L.divIcon({
                        className: 'grid-label',
                        html: label,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(gridLayer);
            }
        }

        L.polyline([[0, cols * cellWidth], [map_scale, cols * cellWidth]], { color: 'white', weight: 1, opacity: 0.7 }).addTo(gridLayer);
        L.polyline([[rows * cellHeight, 0], [rows * cellHeight, map_scale]], { color: 'white', weight: 1, opacity: 0.7 }).addTo(gridLayer);


        // Layer control
        var overlays = { "Grid": gridLayer };
        var layerControl = L.control.layers(null, overlays, { collapsed: false }).addTo(map);

        const fixedAssets = await loadAssets(fixedassetNames, 'Fixed');
        const exoticVoxelIcon = L.icon({
            iconUrl: fixedAssets[0].src,
            iconSize: [50, 30],
            iconAnchor: [25, 15]
        });

        const voxelExoticMarkers = [];
        const voxelExoticMarkersNullSector = [];
        const epsilon = 50;
        // Lets do it with L∞ norm to be slightly faster.
        for (let i = 0; i < X_voxel.length; i++) {
            for (let j = 0; j < exoticPossibleSpawn[0].length; j++) {
                // Only do first if when needed.
                if (Math.abs(X_voxel[i] - exoticPossibleSpawn[0][j]) < epsilon) {
                    if (Math.abs(Y_voxel[i] - exoticPossibleSpawn[1][j]) < epsilon) {
                        const X_voxelPixel = ((X_voxel[i] - Min_map_size_meters) / scale);
                        const Y_voxelPixel = (map_scale - (Max_map_size_meters - Y_voxel[i]) / scale);
                        const latLng = [map_scale - Y_voxelPixel, X_voxelPixel];
                        var marker = L.marker(latLng, { icon: exoticVoxelIcon })
                        marker.bindPopup("Exotic voxel");

                        if (world == "Prometheus") {
                            if (InNullsector(X_voxelPixel, Y_voxelPixel)) {
                                voxelExoticMarkersNullSector.push(marker);
                            } else {
                                voxelExoticMarkers.push(marker);
                            }
                        } else {
                            voxelExoticMarkers.push(marker)
                        }

                    }
                }
            }
        }


        const assets = await loadAssets(assetNames);
        const icons = {};
        assetNames.forEach((name, i) => {
            icons[name] = L.icon({
                iconUrl: assets[i].src,
                iconSize: name.includes('Exotic') ? [40, 40] : [40, 40],
                iconAnchor: name.includes('Exotic') ? [20, 20] : [20, 20] // center anchor
            });
        });
        
        const deepOremarkers = new L.LayerGroup();
        const exoticOreMarkers = new L.LayerGroup();
        const deepOreMarkersNullSector = new L.LayerGroup();
        
        for (let nb_deep_veins = 0; nb_deep_veins < Ressource.length; nb_deep_veins++) {

            const curr_ressource = Ressource[nb_deep_veins];
            id = assetNames.indexOf(curr_ressource);
            const latLng = [map_scale - Y[nb_deep_veins], X[nb_deep_veins]];
            const marker = new L.ImageOverlay(
                `assets/Ores/${curr_ressource}.png`,
                [latLng.map(v => v - 5), latLng.map(v => v + 5)],
                { interactive: true }
            )
            marker.bindPopup(curr_ressource);
            if ((curr_ressource != 'Exotic' && curr_ressource != 'Exotic_Red_Raw')) {
                if (world == "Prometheus") {
                    if (InNullsector(X[nb_deep_veins], Y[nb_deep_veins])) {
                        deepOreMarkersNullSector.addLayer(marker);
                    } else {
                        deepOremarkers.addLayer(marker);
                    }
                } else {
                    deepOremarkers.addLayer(marker);
                }
            }
            if ((curr_ressource == 'Exotic' || curr_ressource == 'Exotic_Red_Raw')) {
                exoticOreMarkers.addLayer(marker);
            }
        };

        let exoticVoxel = L.layerGroup(voxelExoticMarkers);
        const exoticVoxelNullSector = L.layerGroup(voxelExoticMarkersNullSector);
        let deepOre = L.layerGroup([deepOremarkers]);
        const deepOreNullSector = L.layerGroup([deepOreMarkersNullSector]);
        const exoticOre = L.layerGroup([exoticOreMarkers]);


        layerControl.addOverlay(deepOre, "Deep ore veins");
        layerControl.addOverlay(exoticOre, "Exotic Deposit");
        layerControl.addOverlay(exoticVoxel, "Exotic Voxels");
    

        if (world == "Prometheus") {

            const exoticSeedIcon = L.icon({
                iconUrl: fixedAssets[1].src,
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });
            const exoticSeedMarkers = [];
            const exoticSeedMarkersNullSector = [];
            for (let i = 0; i < X_strangePlant.length; i++) {
                const latLng = [map_scale - (map_scale - (Max_map_size_meters - Y_strangePlant[i]) / scale), ((X_strangePlant[i] - Min_map_size_meters) / scale)];
                var marker = L.marker(latLng, { icon: exoticSeedIcon })
                marker.bindPopup("Exotic seed");
                exoticSeedMarkers.push(marker)
            }

            const exoticPlants = L.layerGroup(exoticSeedMarkers);
            layerControl.addOverlay(exoticPlants, "Exotic Plants");

        }

        if (world === "Prometheus") { // smaller map
            initialZoom = 1;
            let showingFull = false;

            const toggleButton = document.getElementById("toggleNull");
            if (toggleButton) {
                // Show the button
                toggleButton.style.display = "inline";
                
                toggleButton.onclick = () => {
                    if (showingFull) {
                        map.removeLayer(imageLayerNullSector);
                        imageLayer.addTo(map);
                        
                        deepOre.clearLayers();
                        deepOre.addLayer(L.layerGroup([deepOremarkers]));

                        exoticVoxel.clearLayers();
                        exoticVoxel.addLayer(L.layerGroup([voxelExoticMarkers]));
                    } else {
                        map.removeLayer(imageLayer);
                        imageLayerNullSector.addTo(map);

                        deepOre.clearLayers();
                        deepOre.addLayer(L.layerGroup([deepOremarkers]));
                        deepOre.addLayer(deepOreNullSector);

                        exoticVoxel.clearLayers();
                        exoticVoxel.addLayer(L.layerGroup([voxelExoticMarkers]));
                        exoticVoxel.addLayer(exoticVoxelNullSector);
                    }
                    showingFull = !showingFull;
                };
            } else {
                console.warn("toggleNull button not found in DOM");
            }
        } else {
            // Hide the button for other worlds
            const toggleButton = document.getElementById("toggleNull");
            if (toggleButton) toggleButton.style.display = "none";
        }


    } catch (err) {
        console.error(err);
        output.textContent = `Error processing ${file.name}: ${err}`;
    }
}

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// -------------------- Handle file drop --------------------
dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "#eef";
});

dropzone.addEventListener("dragleave", (e) => {
    dropzone.style.backgroundColor = "";
});

dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "";

    const file = e.dataTransfer.files[0];
    if (file) {
        handleFile(file);
    }
});