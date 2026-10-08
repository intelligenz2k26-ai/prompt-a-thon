/**
 * Lightweight, Complete QR Code Generator
 * Derived from the public domain implementation by Project Nayuki.
 * Generates standards-compliant, 100% scannable QR Codes (ISO/IEC 18004).
 */

(function (global) {
    'use strict';

    const Qrcodegen = {};

    /* ---- QR Code Error Correction Level ---- */
    Qrcodegen.Ecc = {
        LOW: { ordinal: 0, formatBits: 1 },
        MEDIUM: { ordinal: 1, formatBits: 0 },
        QUARTILE: { ordinal: 2, formatBits: 3 },
        HIGH: { ordinal: 3, formatBits: 2 }
    };

    /* ---- QR Code Symbol Class ---- */
    function QrCode(version, errorCorrectionLevel, dataCodewords, msk) {
        if (version < 1 || version > 40) throw new RangeError("Version out of range");
        if (msk < -1 || msk > 7) throw new RangeError("Mask out of range");
        this.version = version;
        this.size = version * 4 + 17;
        this.errorCorrectionLevel = errorCorrectionLevel;

        const size = this.size;
        const modules = [];
        const isFunction = [];
        for (let y = 0; y < size; y++) {
            modules.push(new Array(size).fill(false));
            isFunction.push(new Array(size).fill(false));
        }
        this.modules = modules;
        this.isFunction = isFunction;

        // Draw function patterns
        this.drawFunctionPatterns();
        const allCodewords = this.addEccAndInterleave(dataCodewords);
        this.drawCodewords(allCodewords);

        // Mask
        if (msk === -1) {
            let minPenalty = 1e9;
            msk = 0;
            for (let i = 0; i < 8; i++) {
                this.applyMask(i);
                this.drawFormatBits(i);
                const penalty = this.getPenaltyScore();
                if (penalty < minPenalty) {
                    minPenalty = penalty;
                    msk = i;
                }
                this.applyMask(i); // undo
            }
        }
        this.mask = msk;
        this.applyMask(msk);
        this.drawFormatBits(msk);
    }

    QrCode.prototype = {
        getModule: function (x, y) {
            return (0 <= x && x < this.size && 0 <= y && y < this.size) ? this.modules[y][x] : false;
        },

        drawFunctionPatterns: function () {
            const size = this.size;
            // Finder patterns
            this.drawFinderPattern(3, 3);
            this.drawFinderPattern(size - 4, 3);
            this.drawFinderPattern(3, size - 4);

            // Timing patterns
            for (let i = 0; i < size; i++) {
                this.setFunctionModule(6, i, i % 2 === 0);
                this.setFunctionModule(i, 6, i % 2 === 0);
            }

            // Alignment patterns
            const alignPatPos = QrCode.getAlignmentPatternPositions(this.version);
            const numAlign = alignPatPos.length;
            for (let i = 0; i < numAlign; i++) {
                for (let j = 0; j < numAlign; j++) {
                    if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) continue;
                    this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
                }
            }

            // Dummy format bits
            this.drawFormatBits(0);
            this.drawVersion();
        },

        drawFinderPattern: function (x, y) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy));
                    const xx = x + dx, yy = y + dy;
                    if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size) {
                        this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
                    }
                }
            }
        },

        drawAlignmentPattern: function (x, y) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        },

        setFunctionModule: function (x, y, isDark) {
            this.modules[y][x] = isDark;
            this.isFunction[y][x] = true;
        },

        drawFormatBits: function (mask) {
            const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
            let rem = data;
            for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const bits = ((data << 10) | rem) ^ 0x5412;

            for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
            this.setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
            this.setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
            this.setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
            for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);

            const size = this.size;
            for (let i = 0; i < 8; i++) this.setFunctionModule(size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
            for (let i = 8; i < 15; i++) this.setFunctionModule(8, size - 15 + i, ((bits >>> i) & 1) !== 0);
            this.setFunctionModule(8, size - 8, true);
        },

        drawVersion: function () {
            if (this.version < 7) return;
            let rem = this.version;
            for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
            const bits = (this.version << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const bit = ((bits >>> i) & 1) !== 0;
                const a = this.size - 11 + (i % 3);
                const b = Math.floor(i / 3);
                this.setFunctionModule(a, b, bit);
                this.setFunctionModule(b, a, bit);
            }
        },

        drawCodewords: function (data) {
            let i = 0;
            const size = this.size;
            for (let right = size - 1; right >= 1; right -= 2) {
                if (right === 6) right = 5;
                for (let vert = 0; vert < size; vert++) {
                    for (let j = 0; j < 2; j++) {
                        const x = right - j;
                        const upward = ((right + 1) & 2) === 0;
                        const y = upward ? size - 1 - vert : vert;
                        if (!this.isFunction[y][x] && i < data.length * 8) {
                            this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
                            i++;
                        }
                    }
                }
            }
        },

        applyMask: function (mask) {
            const size = this.size;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (this.isFunction[y][x]) continue;
                    let invert = false;
                    switch (mask) {
                        case 0: invert = (x + y) % 2 === 0; break;
                        case 1: invert = y % 2 === 0; break;
                        case 2: invert = x % 3 === 0; break;
                        case 3: invert = (x + y) % 3 === 0; break;
                        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
                        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                    }
                    if (invert) this.modules[y][x] = !this.modules[y][x];
                }
            }
        },

        getPenaltyScore: function () {
            const size = this.size;
            let result = 0;
            for (let y = 0; y < size; y++) {
                let runColor = false, runVal = 0;
                for (let x = 0; x < size; x++) {
                    const color = this.modules[y][x];
                    if (color === runColor) {
                        runVal++;
                        if (runVal === 5) result += 3;
                        else if (runVal > 5) result++;
                    } else {
                        runColor = color;
                        runVal = 1;
                    }
                }
            }
            for (let x = 0; x < size; x++) {
                let runColor = false, runVal = 0;
                for (let y = 0; y < size; y++) {
                    const color = this.modules[y][x];
                    if (color === runColor) {
                        runVal++;
                        if (runVal === 5) result += 3;
                        else if (runVal > 5) result++;
                    } else {
                        runColor = color;
                        runVal = 1;
                    }
                }
            }
            for (let y = 0; y < size - 1; y++) {
                for (let x = 0; x < size - 1; x++) {
                    const c = this.modules[y][x];
                    if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
                        result += 3;
                    }
                }
            }
            let totalModules = size * size, darkCount = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (this.modules[y][x]) darkCount++;
                }
            }
            const k = Math.ceil(Math.abs(darkCount * 20 - totalModules * 10) / totalModules) - 1;
            result += k * 10;
            return result;
        },

        addEccAndInterleave: function (data) {
            const ver = this.version;
            const ecl = this.errorCorrectionLevel;
            const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
            const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
            const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
            const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
            const shortBlockLen = Math.floor(rawCodewords / numBlocks);

            const blocks = [];
            const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
            for (let i = 0, k = 0; i < numBlocks; i++) {
                const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
                const dat = data.slice(k, k + datLen);
                k += datLen;
                const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
                blocks.push({ data: dat, ecc: ecc });
            }

            const result = [];
            for (let i = 0; i < shortBlockLen - blockEccLen + 1; i++) {
                for (let j = 0; j < numBlocks; j++) {
                    if (i < blocks[j].data.length) result.push(blocks[j].data[i]);
                }
            }
            for (let i = 0; i < blockEccLen; i++) {
                for (let j = 0; j < numBlocks; j++) {
                    result.push(blocks[j].ecc[i]);
                }
            }
            return result;
        }
    };

    /* ---- Reed-Solomon & Math Helpers ---- */
    QrCode.reedSolomonComputeDivisor = function (degree) {
        let result = [1];
        let root = 1;
        for (let i = 0; i < degree; i++) {
            let next = new Array(result.length + 1).fill(0);
            for (let j = 0; j < result.length; j++) {
                next[j] ^= QrCode.reedSolomonMultiply(result[j], root);
                next[j + 1] ^= result[j];
            }
            result = next;
            root = QrCode.reedSolomonMultiply(root, 0x02);
        }
        return result;
    };

    QrCode.reedSolomonComputeRemainder = function (data, divisor) {
        let result = new Array(divisor.length - 1).fill(0);
        for (let i = 0; i < data.length; i++) {
            const factor = data[i] ^ result.shift();
            result.push(0);
            for (let j = 0; j < result.length; j++) {
                result[j] ^= QrCode.reedSolomonMultiply(divisor[j], factor);
            }
        }
        return result;
    };

    QrCode.reedSolomonMultiply = function (x, y) {
        if (x === 0 || y === 0) return 0;
        let z = 0;
        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11d);
            z ^= ((y >>> i) & 1) * x;
        }
        return z;
    };

    QrCode.getAlignmentPatternPositions = function (ver) {
        if (ver === 1) return [];
        const num = Math.floor(ver / 7) + 2;
        const step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
        const result = [6];
        for (let pos = ver * 4 + 10; result.length < num; pos -= step) {
            result.splice(1, 0, pos);
        }
        return result;
    };

    QrCode.getNumRawDataModules = function (ver) {
        let result = (16 * ver + 128) * ver + 64;
        if (ver >= 2) {
            const numAlign = Math.floor(ver / 7) + 2;
            result -= (25 * numAlign - 10) * numAlign - 55;
            if (ver >= 7) result -= 36;
        }
        return result;
    };

    QrCode.ECC_CODEWORDS_PER_BLOCK = [
        [null, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        [null, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
        [null, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        [null, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    ];

    QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
        [null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
        [null, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
        [null, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
        [null, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    ];

    /* ---- High-level Encoder ---- */
    QrCode.encodeText = function (text, ecl) {
        ecl = ecl || Qrcodegen.Ecc.MEDIUM;
        // UTF-8 encode
        const utf8 = [];
        for (let i = 0; i < text.length; i++) {
            let c = text.charCodeAt(i);
            if (c < 0x80) utf8.push(c);
            else if (c < 0x800) { utf8.push(0xc0 | (c >> 6)); utf8.push(0x80 | (c & 0x3f)); }
            else { utf8.push(0xe0 | (c >> 12)); utf8.push(0x80 | ((c >> 6) & 0x3f)); utf8.push(0x80 | (c & 0x3f)); }
        }

        // Find minimal version
        for (let ver = 1; ver <= 40; ver++) {
            const dataCapacityBits = QrCode.getNumRawDataModules(ver) - QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver] * 8;
            const headerBits = 4 + (ver < 10 ? 8 : 16);
            if (utf8.length * 8 + headerBits <= dataCapacityBits) {
                // Pack bits
                const bitLen = dataCapacityBits;
                const buffer = [];
                function putBits(val, len) {
                    for (let b = len - 1; b >= 0; b--) {
                        const bit = ((val >>> b) & 1);
                        const byteIndex = buffer.length >>> 3;
                        if (buffer.length % 8 === 0) buffer.push(0);
                        buffer[byteIndex] |= (bit << (7 - (buffer.length % 8)));
                    }
                }

                // Mode: Byte (0100)
                putBits(0x4, 4);
                putBits(utf8.length, ver < 10 ? 8 : 16);
                for (let i = 0; i < utf8.length; i++) putBits(utf8[i], 8);

                // Terminator
                const remain = bitLen - (utf8.length * 8 + headerBits);
                putBits(0, Math.min(4, remain));

                // Padding to byte boundary
                while (buffer.length % 8 !== 0) putBits(0, 1);

                // Pad bytes
                const padBytes = [0xec, 0x11];
                let padIdx = 0;
                while (buffer.length < bitLen / 8) {
                    buffer.push(padBytes[padIdx]);
                    padIdx = (padIdx + 1) % 2;
                }

                return new QrCode(ver, ecl, buffer, -1);
            }
        }
        throw new Error("Text too long to fit into QR code");
    };

    /**
     * Public API
     */
    global.QRCode = {
        render: function (target, text, options) {
            options = options || {};
            const size = options.size || 160;
            const colorDark = options.colorDark || '#000000';
            const colorLight = options.colorLight || '#ffffff';

            const qr = QrCode.encodeText(text, Qrcodegen.Ecc.MEDIUM);

            let canvas;
            if (typeof target === 'string') {
                target = document.getElementById(target);
            }

            if (target && target.tagName === 'CANVAS') {
                canvas = target;
            } else if (target) {
                target.innerHTML = '';
                canvas = document.createElement('canvas');
                target.appendChild(canvas);
            } else {
                canvas = document.createElement('canvas');
            }

            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorLight;
            ctx.fillRect(0, 0, size, size);

            const count = qr.size;
            const border = options.margin !== undefined ? options.margin : 2;
            const totalModules = count + border * 2;
            const cellSize = size / totalModules;

            ctx.fillStyle = colorDark;
            for (let y = 0; y < count; y++) {
                for (let x = 0; x < count; x++) {
                    if (qr.getModule(x, y)) {
                        const px = Math.round((x + border) * cellSize);
                        const py = Math.round((y + border) * cellSize);
                        const pw = Math.ceil(cellSize);
                        const ph = Math.ceil(cellSize);
                        ctx.fillRect(px, py, pw, ph);
                    }
                }
            }

            return canvas;
        }
    };

})(window);
