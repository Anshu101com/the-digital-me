/* =========================================================
   THE DIGITAL ME — BOT FIX PACK
   Works with the existing Swarm Construction Engine.
   ========================================================= */

(() => {
    "use strict";

    console.log("🤖 Bot Fix Pack loaded");

    /* -------------------------------------------------------
       1. MOUSE POSITION TRACKING
       ------------------------------------------------------- */

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    document.addEventListener("mousemove", event => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    function mousePosition() {
        return {
            x: mouseX,
            y: mouseY
        };
    }


    /* -------------------------------------------------------
       2. BOT MOVEMENT CONTROL
       Only one normal worker is visible at a time.
       ------------------------------------------------------- */

    let movementQueue = Promise.resolve();
    let activeWorker = null;

    const originalMoveWorker = moveWorker;
    const originalHideWorker = hideWorker;

    function positionWorker(worker, x, y) {
        worker.style.transform = `translate(${x}px, ${y}px)`;
    }

    function deactivateOtherWorkers(currentWorker) {
        if (typeof workers === "undefined") return;

        Object.values(workers).forEach(worker => {
            if (worker !== currentWorker) {
                worker.classList.remove("worker-active");
            }
        });
    }

    function queueMovement(task) {
        const result = movementQueue.then(task, task);

        movementQueue = result.catch(error => {
            console.warn("Bot movement error:", error);
        });

        return result;
    }

    moveWorker = function (worker, target, offsetX = 0, offsetY = 0) {
        if (!worker || !target) return Promise.resolve();

        return queueMovement(async () => {

            if (!target.isConnected) return;

            let rect = target.getBoundingClientRect();

            if (
                rect.top < 90 ||
                rect.bottom > window.innerHeight - 80
            ) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                await sleep(450);

                rect = target.getBoundingClientRect();
            }

            // Hide the previous worker before another starts.
            deactivateOtherWorkers(worker);

            if (activeWorker && activeWorker !== worker) {
                activeWorker.classList.remove("worker-active");
            }

            activeWorker = worker;

            const start = mousePosition();

            // Every bot starts at the current mouse position.
            positionWorker(worker, start.x, start.y);

            worker.classList.add("worker-active");

            await sleep(80);

            const x = rect.left + rect.width / 2 + offsetX;
            const y = rect.top + rect.height / 2 + offsetY;

            positionWorker(worker, x, y);

            await sleep(450);
        });
    };


    /* -------------------------------------------------------
       3. IDLE WORKERS RETURN TO THE MOUSE
       ------------------------------------------------------- */

    hideWorker = function (worker) {
        if (!worker) return;

        const task = async () => {

            if (!worker.isConnected) return;

            const mouse = mousePosition();

            positionWorker(worker, mouse.x, mouse.y);

            await sleep(420);

            worker.classList.remove("worker-active");

            if (activeWorker === worker) {
                activeWorker = null;
            }
        };

        // Hide immediately from the visible work area.
        // Then finish the return animation.
        queueMovement(task);
    };


    /* -------------------------------------------------------
       4. FIX THE EXTRA WRITER BOTS
       The original typeText() created four extra workers
       for every text element. This caused overlapping bots.
       This version prints text without creating extra bots.
       ------------------------------------------------------- */

    typeText = async function (element, text, id, speed = 18) {

        if (!element) return;

        const value = String(text ?? "");

        element.textContent = "";

        const fragment = document.createDocumentFragment();
        const letters = [];

        for (const character of value) {

            const tile = document.createElement("span");

            tile.className =
                character === " "
                    ? "print-space"
                    : "print-letter";

            tile.textContent = character;

            fragment.appendChild(tile);
            letters.push(tile);
        }

        element.appendChild(fragment);

        for (let index = 0; index < letters.length; index++) {

            await waitForResume(id);

            if (skipped || id !== constructionId) {
                element.textContent = value;
                element.classList.add("text-built-clean");
                return;
            }

            letters[index].classList.add("letter-built");

            await sleep(
                characterDelay(letters[index].textContent, speed)
            );
        }

        element.classList.add("text-built-clean");
    };


    /* -------------------------------------------------------
       5. PHOTO BOT SWARM
       Bots enter from underneath the photo, print individual
       tiles, and leave underneath the photo.
       ------------------------------------------------------- */

    printImageWithSwarm = async function (frame, id) {

        if (!frame) return;

        const photo = frame.querySelector("img");
        const placeholder = frame.querySelector(".photo-placeholder");

        if (!photo || !placeholder) return;

        const columns = 5;
        const rows = 2;

        const mosaic = document.createElement("div");
        mosaic.className = "image-print-grid";

        placeholder.appendChild(mosaic);

        const tiles = [];

        // Create the 10 image sections.
        for (let row = 0; row < rows; row++) {

            for (let column = 0; column < columns; column++) {

                const tile = document.createElement("span");

                tile.className = "image-print-tile";

                tile.style.backgroundImage =
                    `url("${photo.getAttribute("src") || ""}")`;

                tile.style.backgroundSize =
                    `${columns * 100}% ${rows * 100}%`;

                tile.style.backgroundPosition =
                    `${column * 100 / (columns - 1)}% ${row * 100}%`;

                mosaic.appendChild(tile);

                tiles.push(tile);
            }
        }

        const imageBots = Array.from(
            { length: 10 },
            (_, index) => createWorker(
                `Pixel Bot ${index + 1}`,
                "☺",
                randomBotColor(),
                "IMAGE TILE"
            )
        );

        const frameRect = frame.getBoundingClientRect();

        const entranceX = frameRect.left + frameRect.width / 2;
        const entranceY = frameRect.bottom + 24;

        // Shuffle tile order.
        const order = tiles
            .map((_, index) => index)
            .sort(() => Math.random() - 0.5);

        for (let index = 0; index < order.length; index++) {

            await waitForResume(id);

            if (skipped || id !== constructionId) break;

            const tile = tiles[order[index]];
            const bot = imageBots[index];

            if (!tile || !bot) continue;

            // Enter from beneath the photo.
            positionWorker(bot, entranceX, entranceY);

            bot.classList.add("worker-active");

            await sleep(250);

            // Move to the assigned image tile.
            const rect = tile.getBoundingClientRect();

            positionWorker(
                bot,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            );

            tile.classList.add("scanning");

            await sleep(500);

            tile.classList.remove("scanning");
            tile.classList.add("printed");

            // Return underneath the photo.
            positionWorker(bot, entranceX, entranceY);

            await sleep(300);

            bot.classList.remove("worker-active");
        }

        imageBots.forEach(bot => bot.remove());

        mosaic.remove();

        if (photo.complete && photo.naturalWidth > 0) {
            photo.classList.add("photo-printed");
        } else {
            placeholder.classList.add("photo-printed");
        }

        showBotMessage("How are you? 😊", frame);
    };


    /* -------------------------------------------------------
       6. FINISHER BOT
       The finisher only scans the page.
       It does NOT recolour, repaint or modify page elements.
       ------------------------------------------------------- */

    finisherTask = async function (data, id) {

        setStatus("finisher", "Preparing page scan");

        // Wait for the navigation to appear.
        while (
            !skipped &&
            id === constructionId &&
            !document.querySelector(".site-header")
        ) {
            await sleep(100);
        }

        if (skipped || id !== constructionId) return;

        setStatus("finisher", "Scanning page details");

        // Wait for construction activity to settle.
        let previousCount = -1;
        let stableTime = 0;
        const startTime = Date.now();

        while (
            !skipped &&
            id === constructionId &&
            Date.now() - startTime < 20000
        ) {

            const count = document.querySelectorAll(
                "#site-root > *"
            ).length;

            if (count === previousCount) {
                stableTime += 200;
            } else {
                stableTime = 0;
                previousCount = count;
            }

            if (stableTime >= 1000) break;

            await sleep(200);
        }

        if (skipped || id !== constructionId) return;

        const sections = Array.from(
            document.querySelectorAll(
                "#site-root > header, #site-root > section"
            )
        );

        const scanner = document.createElement("div");

        scanner.className = "finisher-scan-line";

        setStatus("finisher", "Checking every section");

        for (const section of sections) {

            if (skipped || id !== constructionId) break;

            await waitForResume(id);

            if (!section.isConnected) continue;

            const rect = section.getBoundingClientRect();

            const scanX = rect.left + rect.width / 2;
            const scanY = rect.top + 25;

            // The finisher starts from the mouse.
            const mouse = mousePosition();

            positionWorker(
                workers.finisher,
                mouse.x,
                mouse.y
            );

            deactivateOtherWorkers(workers.finisher);

            workers.finisher.classList.add("worker-active");

            await sleep(100);

            // Move to the section being scanned.
            positionWorker(
                workers.finisher,
                scanX,
                scanY
            );

            section.appendChild(scanner);

            scanner.classList.remove("scan-running");

            void scanner.offsetWidth;

            scanner.classList.add("scan-running");

            await sleep(750);

            scanner.remove();

            await sleep(150);
        }

        scanner.remove();

        hideWorker(workers.finisher);

        setStatus("finisher", "Page scan complete ✓");
    };


    /* -------------------------------------------------------
       7. PREVENT THE ORIGINAL STARTUP FROM SHOWING
       ALL FOUR WORKERS AT ONCE.
       ------------------------------------------------------- */

    if (typeof workers !== "undefined") {

        Object.values(workers).forEach(worker => {
            worker.classList.remove("worker-active");
        });
    }


    /* -------------------------------------------------------
       8. CLEANUP
       ------------------------------------------------------- */

    window.addEventListener("resize", () => {

        if (!activeWorker) return;

        const mouse = mousePosition();

        positionWorker(
            activeWorker,
            mouse.x,
            mouse.y
        );
    });

    console.log("✅ Bot movement fixes applied");

})();