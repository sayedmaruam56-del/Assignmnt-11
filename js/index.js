const CONFIG = Object.freeze({
    NASA_KEY: "bU7WaOFtMVnWeJGvbySkFHQt5WestD49c69xOgQa",
    NASA_URL: "https://api.nasa.gov/planetary/apod",
    LAUNCHES_URL: "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10",
    LAUNCHES_FALLBACK: "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=10",
    PLANETS_URL: "https://solar-system-opendata-proxy.vercel.app/api/planets",
    PLANET_ORDER: ["uranus", "neptune", "jupiter", "mars", "mercury", "saturn", "earth", "venus"],
    PLANET_IMAGES: {
        mercury: "images/mercury.png",
        venus: "images/venus.png",
        earth: "images/earth.png",
        mars: "images/mars.png",
        jupiter: "images/jupiter.png",
        saturn: "images/saturn.png",
        uranus: "images/uranus.png",
        neptune: "images/neptune.png"
    },
    PLANET_COLORS: {
        mercury: "#eab308",
        venus: "#f97316",
        earth: "#3b82f6",
        mars: "#ef4444",
        jupiter: "#fb923c",
        saturn: "#facc15",
        uranus: "#06b6d4",
        neptune: "#2563eb"
    },
    STATUS_MAP: {
        Go: "green",
        Success: "green",
        TBD: "yellow",
        Hold: "red",
        TBC: "yellow",
        Partial: "yellow",
        Failure: "red"
    },
    DESCRIPTIONS: {
        earth: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of Earth's surface is land consisting of continents and islands. The remaining 71% is covered with water, mostly by oceans, seas, gulfs, and other salt-water bodies, but also by lakes, rivers, and other fresh water, which together constitute the hydrosphere.",
        mars: "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. Named after the Roman god of war, it is often referred to as the 'Red Planet' due to its reddish appearance.",
        jupiter: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass one-thousandth that of the Sun, but two-and-a-half times that of all the other planets combined.",
        saturn: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System. It is a gas giant with an average radius about nine times that of Earth, and is best known for its extensive ring system.",
        venus: "Venus is the second planet from the Sun. It is named after the Roman goddess of love and beauty. As the second-brightest natural object in the night sky after the Moon, Venus can cast shadows.",
        mercury: "Mercury is the smallest planet in the Solar System and the closest to the Sun. Its orbit around the Sun takes 87.97 Earth days, the shortest of all the planets in the Solar System.",
        uranus: "Uranus is the seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System. Uranus is unique in that it rotates on its side.",
        neptune: "Neptune is the eighth and farthest known planet from the Sun in the Solar System. It is the fourth-largest planet by diameter and the third-most-massive planet."
    }
});

const Utils = {
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },
    $$(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },
    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? "";
    },
    setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html ?? "";
    },
    formatDate(dateStr, options = { year: "numeric", month: "long", day: "numeric" }) {
        return new Date(dateStr).toLocaleDateString("en-US", options);
    },
    formatTime(dateStr) {
        return `${new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
    },
    calcDaysDiff(dateStr) {
        return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    },
    formatNumber(num, fractionDigits = 0) {
        return typeof num === "number" && !isNaN(num) ? num.toLocaleString("en-US", { maximumFractionDigits: fractionDigits }) : "N/A";
    },
    getTodayISO() {
        return new Date().toISOString().split("T")[0];
    }
};

const ApiService = {
    async fetchJSON(url, fallbackUrl = null) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            if (fallbackUrl) {
                const fallbackRes = await fetch(fallbackUrl);
                if (fallbackRes.ok) return await fallbackRes.json();
            }
            throw err;
        }
    },
    async getApod(date = null) {
        const dateQuery = date ? `&date=${date}` : "";
        const primary = `${CONFIG.NASA_URL}?api_key=${CONFIG.NASA_KEY}${dateQuery}`;
        const fallback = `${CONFIG.NASA_URL}?api_key=DEMO_KEY${dateQuery}`;
        return this.fetchJSON(primary, fallback);
    },
    async getLaunches() {
        return this.fetchJSON(CONFIG.LAUNCHES_URL, CONFIG.LAUNCHES_FALLBACK);
    },
    async getPlanets() {
        return this.fetchJSON(CONFIG.PLANETS_URL);
    }
};

const ApodManager = {
    init() {
        this.container = Utils.$("#apod-image-container");
        this.loading = Utils.$("#apod-loading");
        this.img = Utils.$("#apod-image");
        this.dateInput = Utils.$("#apod-date-input");
        this.loadBtn = Utils.$("#load-date-btn");
        this.todayBtn = Utils.$("#today-apod-btn");
        this.setupDatePicker();
        this.fetch();
    },
    setupDatePicker() {
        if (!this.dateInput) return;
        const wrapper = this.dateInput.closest(".date-input-wrapper");
        const today = Utils.getTodayISO();

        this.dateInput.max = today;
        this.dateInput.value = today;

        const updateLabel = (val) => {
            if (wrapper) {
                wrapper.setAttribute("data-date", val ? Utils.formatDate(val + "T00:00:00", { year: "numeric", month: "short", day: "numeric" }) : "Select a date");
            }
        };

        updateLabel(today);
        this.dateInput.addEventListener("change", () => updateLabel(this.dateInput.value));

        const submitDate = () => { if (this.dateInput.value) this.fetch(this.dateInput.value); };
        this.loadBtn?.addEventListener("click", submitDate);
        this.dateInput.addEventListener("keypress", (e) => { if (e.key === "Enter") submitDate(); });

        this.todayBtn?.addEventListener("click", () => {
            this.dateInput.value = today;
            updateLabel(today);
            this.fetch(null);
        });
    },
    async fetch(date = null) {
        if (!this.container || !this.loading || !this.img) return;

        this.loading.classList.remove("hidden");
        this.loading.innerHTML = `<i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i><p class="text-slate-400">Loading today's image...</p>`;
        this.img.classList.add("hidden");
        this.img.src = "";

        Utils.$(".apod-overlay", this.container)?.remove();
        Utils.$("iframe", this.container)?.remove();

        try {
            const data = await ApiService.getApod(date);
            this.render(data);
        } catch (error) {
            this.loading.innerHTML = `
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <p class="text-slate-400">Failed to load space image</p>
                <p class="text-slate-500 text-sm mt-2">Please try again later</p>
            `;
        }
    },
    render(data) {
        const formattedDate = Utils.formatDate(data.date + "T00:00:00");

        Utils.setText("apod-date", `Astronomy Picture of the Day - ${formattedDate}`);
        Utils.setHTML("apod-date-detail", `<i class="far fa-calendar mr-2"></i>${formattedDate}`);
        Utils.setText("apod-date-info", data.date);
        Utils.setText("apod-title", data.title || "Astronomy Picture of the Day");
        Utils.setText("apod-explanation", data.explanation || "No description provided.");
        Utils.setText("apod-media-type", data.media_type === "video" ? "Video" : "Image");

        const copyrightEl = Utils.$("#apod-copyright");
        if (copyrightEl) {
            if (data.copyright) {
                copyrightEl.innerHTML = `<i class="fas fa-copyright mr-1"></i>Copyright: ${data.copyright.trim().replace(/\n/g, " ")}`;
                copyrightEl.classList.remove("hidden");
            } else {
                copyrightEl.classList.add("hidden");
            }
        }

        if (data.media_type === "image") {
            this.img.src = data.url;
            this.img.alt = data.title || "APOD";
            this.img.onload = () => {
                this.loading.classList.add("hidden");
                this.img.classList.remove("hidden");
            };
            this.img.onerror = () => {
                this.loading.innerHTML = `<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load image</p>`;
            };

            const overlay = document.createElement("div");
            overlay.className = "apod-overlay absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity";
            overlay.innerHTML = `
                <div class="absolute bottom-6 left-6 right-6">
                    <a href="${data.hdurl || data.url}" target="_blank" rel="noopener noreferrer" class="block w-full py-3 bg-white/10 backdrop-blur-md rounded-lg font-semibold hover:bg-white/20 transition-colors text-center text-white">
                        <i class="fas fa-expand mr-2"></i>View Full Resolution
                    </a>
                </div>
            `;
            this.container.appendChild(overlay);
        } else if (data.media_type === "video") {
            this.loading.classList.add("hidden");
            const iframe = document.createElement("iframe");
            iframe.src = data.url;
            iframe.className = "w-full h-full rounded-2xl";
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allowfullscreen", "true");
            this.container.appendChild(iframe);
        }
    }
};

const LaunchesManager = {
    launches: [],
    init() {
        this.featuredEl = Utils.$("#featured-launch");
        this.gridEl = Utils.$("#launches-grid");
        this.fetch();
    },
    async fetch() {
        try {
            const data = await ApiService.getLaunches();
            this.launches = data.results || [];
            this.updateCounter();
            this.renderFeatured();
            this.renderGrid();
        } catch (error) {
            const errorHtml = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-red-400 text-5xl mb-4"></i>
                    <p class="text-slate-400 text-lg">Failed to load launches data</p>
                    <p class="text-slate-500 text-sm mt-2">Please try again later</p>
                </div>
            `;
            if (this.featuredEl) this.featuredEl.innerHTML = errorHtml;
            if (this.gridEl) this.gridEl.innerHTML = errorHtml;
        }
    },
    updateCounter() {
        Utils.setText("launches-count", `${this.launches.length} Launches`);
        Utils.setText("launches-count-mobile", `${this.launches.length}`);
    },
    renderFeatured() {
        if (!this.featuredEl || !this.launches.length) return;
        const launch = this.launches[0];
        const days = Utils.calcDaysDiff(launch.net);
        const status = launch.status?.abbrev || "TBD";
        const color = CONFIG.STATUS_MAP[status] || "blue";
        const image = launch.image?.image_url || launch.rocket?.configuration?.image_url || "";

        this.featuredEl.innerHTML = `
            <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
                <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
                    <div class="flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-3 mb-4">
                                <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                                    <i class="fas fa-star"></i> Featured Launch
                                </span>
                                <span class="px-4 py-1.5 bg-${color}-500/20 text-${color}-400 rounded-full text-sm font-semibold">${status}</span>
                            </div>
                            <h3 class="text-3xl font-bold mb-3 leading-tight">${launch.name}</h3>
                            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
                                <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${launch.launch_service_provider?.name || "Unknown"}</span></div>
                                <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${launch.rocket?.configuration?.name || "Rocket"}</span></div>
                            </div>
                            ${days > 0 ? `
                            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
                                <i class="fas fa-clock text-2xl text-blue-400"></i>
                                <div>
                                    <p class="text-2xl font-bold text-blue-400">${days}</p>
                                    <p class="text-xs text-slate-400">Days Until Launch</p>
                                </div>
                            </div>` : ""}
                            <div class="grid xl:grid-cols-2 gap-4 mb-6">
                                <div class="bg-slate-900/50 rounded-xl p-4">
                                    <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i>Launch Date</p>
                                    <p class="font-semibold">${Utils.formatDate(launch.net, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                                </div>
                                <div class="bg-slate-900/50 rounded-xl p-4">
                                    <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i>Launch Time</p>
                                    <p class="font-semibold">${Utils.formatTime(launch.net)}</p>
                                </div>
                                <div class="bg-slate-900/50 rounded-xl p-4">
                                    <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i>Location</p>
                                    <p class="font-semibold text-sm">${launch.pad?.location?.name || "Unknown"}</p>
                                </div>
                                <div class="bg-slate-900/50 rounded-xl p-4">
                                    <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i>Country</p>
                                    <p class="font-semibold">${launch.pad?.location?.country?.name || launch.pad?.country?.name || "Global"}</p>
                                </div>
                            </div>
                            <p class="text-slate-300 leading-relaxed mb-6">${launch.mission?.description || "Mission details will be available closer to launch date."}</p>
                        </div>
                        <div class="flex flex-col md:flex-row gap-3">
                            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer">
                                <i class="fas fa-info-circle"></i> View Full Details
                            </button>
                            <div class="icons self-end md:self-center flex gap-2">
                                <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors cursor-pointer"><i class="far fa-heart"></i></button>
                                <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors cursor-pointer"><i class="fas fa-bell"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="relative">
                        ${image ? `
                        <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
                            <img src="${image}" alt="${launch.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/launch-placeholder.png';" />
                            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
                        </div>` : `
                        <div class="flex items-center justify-center h-full min-h-[400px] bg-slate-900/50 rounded-2xl">
                            <div class="text-center"><i class="fas fa-rocket text-6xl text-slate-700 mb-4"></i><p class="text-slate-500">No image available</p></div>
                        </div>`}
                    </div>
                </div>
            </div>
        `;
    },
    renderGrid() {
        if (!this.gridEl || !this.launches.length) return;
        this.gridEl.innerHTML = this.launches.slice(1, 10).map(launch => {
            const status = launch.status?.abbrev || "TBD";
            const color = CONFIG.STATUS_MAP[status] || "blue";
            const thumb = launch.image?.thumbnail_url || launch.image?.image_url || "";

            return `
                <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
                    ${thumb ? `
                    <div class="relative h-48 overflow-hidden bg-slate-900/50">
                        <img src="${thumb}" alt="${launch.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.onerror=null; this.src='images/launch-placeholder.png';" />
                        <div class="absolute top-3 right-3"><span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">${status}</span></div>
                    </div>` : `
                    <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
                        <i class="fas fa-rocket text-5xl text-slate-700"></i>
                        <div class="absolute top-3 right-3"><span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">${status}</span></div>
                    </div>`}
                    <div class="p-5">
                        <div class="mb-3">
                            <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${launch.name}</h4>
                            <p class="text-sm text-slate-400 flex items-center gap-2"><i class="fas fa-building text-xs"></i>${launch.launch_service_provider?.name || "Unknown"}</p>
                        </div>
                        <div class="space-y-2 mb-4">
                            <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${Utils.formatDate(launch.net, { month: "short", day: "numeric", year: "numeric" })}</span></div>
                            <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${Utils.formatTime(launch.net)}</span></div>
                            <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300">${launch.rocket?.configuration?.name || "N/A"}</span></div>
                            <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${launch.pad?.location?.name || "Unknown"}</span></div>
                        </div>
                        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
                            <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold cursor-pointer">Details</button>
                            <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"><i class="far fa-heart"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
};

const PlanetsManager = {
    planets: [],
    init() {
        this.gridEl = Utils.$("#planets-grid");
        this.tbodyEl = Utils.$("#planet-comparison-tbody");
        this.fetch();
    },
    async fetch() {
        try {
            const data = await ApiService.getPlanets();
            const raw = Array.isArray(data) ? data : (data.bodies || []);
            this.planets = raw.filter(b => b.isPlanet === true || b.bodyType === "Planet")
                              .sort((a, b) => {
                                  const idxA = CONFIG.PLANET_ORDER.indexOf(a.englishName?.toLowerCase());
                                  const idxB = CONFIG.PLANET_ORDER.indexOf(b.englishName?.toLowerCase());
                                  return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
                              });

            this.renderGrid();
            this.renderTable();

            const defaultPlanet = this.planets.find(p => p.englishName?.toLowerCase() === "earth") || this.planets[0];
            if (defaultPlanet) this.displayDetail(defaultPlanet);
        } catch (error) {
            if (this.gridEl) {
                this.gridEl.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i>
                        <p class="text-slate-400">Failed to load planets data. Please try again later.</p>
                    </div>
                `;
            }
        }
    },
    renderGrid() {
        if (!this.gridEl || !this.planets.length) return;
        this.gridEl.innerHTML = this.planets.map(planet => {
            const key = planet.englishName.toLowerCase();
            const color = CONFIG.PLANET_COLORS[key] || "#64748b";
            const img = CONFIG.PLANET_IMAGES[key] || planet.image || "images/earth.png";
            const au = (planet.semimajorAxis / 149597870.7).toFixed(2);

            return `
                <div class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group"
                     data-planet-id="${planet.id}"
                     style="--planet-color: ${color}"
                     onmouseover="this.style.borderColor='${color}80'"
                     onmouseout="this.style.borderColor='#334155'">
                    <div class="relative mb-3 h-24 flex items-center justify-center">
                        <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300" src="${img}" alt="${planet.englishName}" />
                    </div>
                    <h4 class="font-semibold text-center text-sm">${planet.englishName}</h4>
                    <p class="text-xs text-slate-400 text-center">${au} AU</p>
                </div>
            `;
        }).join("");

        Utils.$$(".planet-card", this.gridEl).forEach(card => {
            card.addEventListener("click", () => {
                const selected = this.planets.find(p => p.id === card.dataset.planetId);
                if (selected) this.displayDetail(selected);
            });
        });
    },
    displayDetail(planet) {
        const key = planet.englishName.toLowerCase();
        const imgEl = Utils.$("#planet-detail-image");
        if (imgEl) {
            imgEl.src = CONFIG.PLANET_IMAGES[key] || planet.image || "images/earth.png";
            imgEl.alt = planet.englishName;
        }

        Utils.setText("planet-detail-name", planet.englishName);
        Utils.setText("planet-detail-description", planet.description || CONFIG.DESCRIPTIONS[key] || `${planet.englishName} is a major planet in our solar system.`);
        Utils.setText("planet-distance", `${(planet.semimajorAxis / 1e6).toFixed(1)}M km`);
        Utils.setText("planet-radius", planet.meanRadius ? `${Utils.formatNumber(Math.round(planet.meanRadius))} km` : "N/A");
        Utils.setText("planet-mass", planet.mass ? `${planet.mass.massValue} × 10^${planet.mass.massExponent} kg` : "N/A");
        Utils.setText("planet-density", planet.density ? `${planet.density.toFixed(2)} g/cm³` : "N/A");
        Utils.setText("planet-orbital-period", planet.sideralOrbit ? `${planet.sideralOrbit.toFixed(2)} days` : "N/A");
        Utils.setText("planet-rotation", planet.sideralRotation ? `${Math.abs(planet.sideralRotation).toFixed(2)} hours` : "N/A");
        Utils.setText("planet-moons", planet.moons ? planet.moons.length : 0);
        Utils.setText("planet-gravity", planet.gravity ? `${planet.gravity.toFixed(2)} m/s²` : "N/A");
        Utils.setText("planet-discoverer", planet.discoveredBy || "Known since antiquity");
        Utils.setText("planet-discovery-date", planet.discoveryDate || "Ancient");
        Utils.setText("planet-body-type", planet.bodyType || "Planet");
        Utils.setText("planet-volume", planet.vol ? `${planet.vol.volValue} × 10^${planet.vol.volExponent} km³` : "N/A");
        Utils.setText("planet-perihelion", planet.perihelion ? `${(planet.perihelion / 1e6).toFixed(1)}M km` : "N/A");
        Utils.setText("planet-aphelion", planet.aphelion ? `${(planet.aphelion / 1e6).toFixed(1)}M km` : "N/A");
        Utils.setText("planet-eccentricity", planet.eccentricity !== undefined ? planet.eccentricity.toFixed(4) : "N/A");
        Utils.setText("planet-inclination", planet.inclination !== undefined ? `${planet.inclination.toFixed(2)}°` : "N/A");
        Utils.setText("planet-axial-tilt", planet.axialTilt !== undefined ? `${planet.axialTilt.toFixed(2)}°` : "N/A");
        Utils.setText("planet-temp", planet.avgTemp !== undefined ? `${planet.avgTemp}°C` : "N/A");
        Utils.setText("planet-escape", planet.escape ? `${(planet.escape / 1e3).toFixed(2)} km/s` : "N/A");

        const factsEl = Utils.$("#planet-facts");
        if (factsEl) {
            const facts = [];
            if (planet.mass) facts.push(`Mass: ${planet.mass.massValue} × 10^${planet.mass.massExponent} kg`);
            if (planet.gravity) facts.push(`Surface gravity: ${planet.gravity} m/s²`);
            if (planet.density) facts.push(`Density: ${planet.density} g/cm³`);
            if (planet.axialTilt !== undefined) facts.push(`Axial tilt: ${planet.axialTilt}°`);
            if (planet.discoveredBy) facts.push(`Discovered by: ${planet.discoveredBy}`);
            if (facts.length < 4 && planet.meanRadius) facts.push(`Mean radius: ${Utils.formatNumber(Math.round(planet.meanRadius))} km`);
            if (facts.length < 4 && planet.moons) facts.push(`Has ${planet.moons.length} known moon(s)`);

            factsEl.innerHTML = facts.slice(0, 4).map(f => `
                <li class="flex items-start">
                    <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
                    <span class="text-slate-300">${f}</span>
                </li>
            `).join("");
        }
    },
    renderTable() {
        if (!this.tbodyEl || !this.planets.length) return;
        const earth = this.planets.find(p => p.englishName.toLowerCase() === "earth");
        const earthMass = earth?.mass ? earth.mass.massValue * Math.pow(10, earth.mass.massExponent) : 1;

        this.tbodyEl.innerHTML = this.planets.map(planet => {
            const key = planet.englishName.toLowerCase();
            const color = CONFIG.PLANET_COLORS[key] || "#64748b";
            const au = (planet.semimajorAxis / 149597870.7).toFixed(2);
            const diameter = planet.meanRadius ? Utils.formatNumber(Math.round(planet.meanRadius * 2)) : "N/A";
            const mass = planet.mass ? planet.mass.massValue * Math.pow(10, planet.mass.massExponent) : 0;
            const relMass = (mass / earthMass).toFixed(3);
            const orbit = planet.sideralOrbit ? (planet.sideralOrbit > 365 ? `${(planet.sideralOrbit / 365.25).toFixed(1)} years` : `${Math.round(planet.sideralOrbit)} days`) : "N/A";
            const moons = planet.moons ? planet.moons.length : 0;

            let typeName = planet.type || "Terrestrial";
            let badgeBg = "#f9731680";
            let badgeText = "#fb923c";

            if (["jupiter", "saturn"].includes(key)) {
                typeName = "Gas Giant";
                badgeBg = "#a855f780";
                badgeText = "#c084fc";
            } else if (["uranus", "neptune"].includes(key)) {
                typeName = "Ice Giant";
                badgeBg = "#3b82f680";
                badgeText = "#60a5fa";
            }

            const rowClass = key === "earth" ? "hover:bg-slate-800/30 transition-colors bg-blue-500/5" : "hover:bg-slate-800/30 transition-colors";

            return `
                <tr class="${rowClass}">
                    <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
                        <div class="flex items-center space-x-2 md:space-x-3">
                            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full shrink-0" style="background-color: ${color}"></div>
                            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${planet.englishName}</span>
                        </div>
                    </td>
                    <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${au}</td>
                    <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${diameter}</td>
                    <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${relMass}</td>
                    <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${orbit}</td>
                    <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${moons}</td>
                    <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span class="px-2 py-1 rounded text-xs" style="background-color: ${badgeBg}; color: ${badgeText}">${typeName}</span>
                    </td>
                </tr>
            `;
        }).join("");
    }
};

const NavigationManager = {
    init() {
        this.navLinks = Utils.$$(".nav-link");
        this.sections = Utils.$$(".app-section");
        this.sidebar = Utils.$("#sidebar");
        this.toggleBtn = Utils.$("#sidebar-toggle");
        this.overlay = null;

        this.setupRouting();
        this.setupSidebar();
    },
    setupRouting() {
        const switchSection = (target) => {
            this.sections.forEach(s => s.classList.add("hidden"));
            Utils.$$(`[data-section="${target}"]`).forEach(s => s.classList.remove("hidden"));

            this.navLinks.forEach(link => {
                const isActive = link.dataset.section === target;
                link.classList.toggle("bg-blue-500/10", isActive);
                link.classList.toggle("text-blue-400", isActive);
                link.classList.toggle("text-slate-300", !isActive);
                link.classList.toggle("hover:bg-slate-800", !isActive);
            });

            window.scrollTo({ top: 0, behavior: "smooth" });
        };

        this.navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                if (link.dataset.section) {
                    switchSection(link.dataset.section);
                    this.closeSidebar();
                }
            });
        });

        switchSection("today-in-space");
    },
    setupSidebar() {
        if (!this.sidebar || !this.toggleBtn) return;

        this.toggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.sidebar.classList.contains("sidebar-open") ? this.closeSidebar() : this.openSidebar();
        });

        window.closeSidebar = () => this.closeSidebar();
    },
    openSidebar() {
        this.sidebar?.classList.add("sidebar-open");
        if (!this.overlay) {
            this.overlay = document.createElement("div");
            this.overlay.className = "sidebar-overlay";
            this.overlay.addEventListener("click", () => this.closeSidebar());
            document.body.appendChild(this.overlay);
        }
    },
    closeSidebar() {
        this.sidebar?.classList.remove("sidebar-open");
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    NavigationManager.init();
    ApodManager.init();
    PlanetsManager.init();
    LaunchesManager.init();
});