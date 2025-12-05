(() => {
    const modal = document.getElementById("audio-modal");
    const overlay = modal?.querySelector(".audio-modal__overlay");
    const closeBtn = document.getElementById("audio-close");
    const fileInput = document.getElementById("file-input");
    const filePicker = document.getElementById("file-picker");
    const dropZone = document.getElementById("drop-zone");
    const micToggle = document.getElementById("mic-toggle");
    const sourceLabel = document.getElementById("source-label");
    const audioEl = document.getElementById("audio-player");
    const canvas = document.getElementById("visualizer");
    const ctx = canvas?.getContext("2d");

    if (!modal || !overlay || !closeBtn || !fileInput || !filePicker || !dropZone || !micToggle || !sourceLabel || !audioEl || !canvas || !ctx) {
        console.warn("Audio modal: elements missing, initialization skipped.");
        return;
    }

    let audioCtx;
    let analyser;
    let mediaElementNode;
    let micSource;
    let micStream;
    let rafId;
    let micEnabled = false;

    const setLabel = (text) => {
        sourceLabel.textContent = text;
    };

    const ensureContext = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!analyser) {
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 1024;
        }
    };

    const resizeCanvas = () => {
        const ratio = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        canvas.width = canvas.clientWidth * ratio;
        canvas.height = canvas.clientHeight * ratio;
        ctx.scale(ratio, ratio);
    };

    const stopVisualizer = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const showFilePlayer = (show) => {
        if (show) {
            audioEl.classList.remove("hidden");
        } else {
            audioEl.classList.add("hidden");
        }
    };

    const draw = () => {
        if (!analyser) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Generate random but persistent angles and frequency indices
        const spikeCount = 80;
        const randomAngles = Array.from({length: spikeCount}, () => Math.random() * Math.PI * 2);
        const randomFreqIndices = Array.from({length: spikeCount}, () => Math.floor(Math.random() * bufferLength));

        const render = () => {
            analyser.getByteFrequencyData(dataArray);
            
            // Recalculate dimensions every frame for responsiveness
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 3.5;
            
            ctx.clearRect(0, 0, width, height);

            // Draw horizontal ondulating wave line in center (behind circle)
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.shadowColor = "rgba(128, 128, 128, 0.3)";
            ctx.shadowBlur = 10;

            const wavePoints = 200;
            const waveAmplitude = 40; // Amplitude relative to the drawing area
            const waveWidth = width; // Full width
            const startX = 0; // Start from left edge
            const waveCenterY = centerY + 10; // Offset down to match circle center
            
            for (let i = 0; i <= wavePoints; i++) {
                const x = (i / wavePoints) * waveWidth;
                const dataIndex = Math.floor((i / wavePoints) * bufferLength);
                const value = dataArray[dataIndex] || 0;
                const normalizedValue = (value / 255) * 2 - 1; // Range from -1 to 1
                const y = waveCenterY + normalizedValue * waveAmplitude;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            const gradient = ctx.createLinearGradient(startX, 0, startX + waveWidth, 0);
            gradient.addColorStop(0, "rgba(128, 128, 128, 0.2)");
            gradient.addColorStop(0.5, "rgba(160, 160, 160, 0.4)");
            gradient.addColorStop(1, "rgba(128, 128, 128, 0.2)");
            ctx.strokeStyle = gradient;
            ctx.stroke();

            // Draw smooth circle outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(108, 123, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw spikes with random frequency data
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            for (let i = 0; i < spikeCount; i++) {
                const value = dataArray[randomFreqIndices[i]] || 0;
                const spikeLength = (value / 255) * radius * 0.8;
                const angle = randomAngles[i];
                
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + spikeLength);
                const y2 = centerY + Math.sin(angle) * (radius + spikeLength);

                // Glow effect
                ctx.shadowColor = "#3ce0a6";
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, "rgba(108, 123, 255, 0.6)");
                grad.addColorStop(0.5, "rgba(108, 123, 255, 1)");
                grad.addColorStop(1, "rgba(60, 224, 166, 1)");
                
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            
            ctx.shadowColor = "transparent";
            rafId = requestAnimationFrame(render);
        };
        render();
    };

    const disconnectSources = () => {
        if (mediaElementNode) mediaElementNode.disconnect();
        if (micSource) micSource.disconnect();
        if (analyser) analyser.disconnect();
    };

    const stopMic = () => {
        if (micStream) {
            micStream.getTracks().forEach((t) => t.stop());
            micStream = null;
        }
        if (micSource) {
            micSource.disconnect();
            micSource = null;
        }
        micEnabled = false;
        micToggle.classList.remove("active");
    };

    const connectMediaElement = () => {
        ensureContext();
        if (!mediaElementNode) {
            mediaElementNode = audioCtx.createMediaElementSource(audioEl);
        }
        disconnectSources();
        mediaElementNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        audioEl.muted = false;
        draw();
    };

    const connectMic = async () => {
        if (micEnabled) {
            stopMic();
            setLabel("Micro coupé");
            stopVisualizer();
            return;
        }

        try {
            ensureContext();
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            micSource = audioCtx.createMediaStreamSource(micStream);
            disconnectSources();
            micSource.connect(analyser);
            
            micEnabled = true;
            micToggle.classList.add("active");
            setLabel("Micro en direct");
            showFilePlayer(false);
            draw();
        } catch (err) {
            console.error(err);
            setLabel("Accès micro refusé");
        }
    };

    const loadFile = (file) => {
        if (!file) return;
        stopMic();
        micToggle.classList.remove("active");
        const url = URL.createObjectURL(file);
        audioEl.srcObject = null;
        audioEl.src = url;
        audioEl.play();
        setLabel(`Fichier: ${file.name}`);
        connectMediaElement();
    };

    const handleFiles = (files) => {
        const [file] = files;
        if (!file || !file.type.startsWith("audio")) {
            setLabel("Choisissez un fichier audio valide");
            return;
        }
        loadFile(file);
    };

    const openModal = () => {
        modal.classList.add("active");
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        setLabel("Aucune source sélectionnée");
        resizeCanvas();
    };

    const closeModal = () => {
        modal.classList.remove("active");
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        stopVisualizer();
        stopMic();
        audioEl.pause();
    };

    // Public API for button
    window.ouvrirInterfaceModal = () => openModal();
    window.ouvrirInterface = () => openModal();

    // UI bindings
    filePicker.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragging");
    });

    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragging");
        handleFiles(e.dataTransfer.files);
    });

    micToggle.addEventListener("click", () => connectMic());

    overlay.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });

    audioEl.addEventListener("play", async () => {
        if (audioCtx) await audioCtx.resume();
    });

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
})();
