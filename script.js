/**
 * =========================================
 * FILE: script.js - Logika Utama Green Grid Hub
 * Menggabungkan Simulasi Pilihan Energi, Visualisasi Chart, dan Simulasi Chat AI.
 * =========================================
 */

// --- 1. Basis Data Asumsi Lingkungan & Metrik Teknologi ---
const dataLingkungan = {
    // Data (Skor Kelayakan F) diasumsikan, dinormalisasi 0 - 10
    // Scoring: surya, wind, geo (geotermal), hydro
    "jakarta": { surya: 9.0, wind: 3.0, geo: 1.0, hydro: 2.0 },
    "yogyakarta": { surya: 8.5, wind: 4.5, geo: 3.0, hydro: 3.5 },
    "bandung": { surya: 7.5, wind: 3.0, geo: 8.0, hydro: 6.0 }, // Dekat area vulkanik
    "surabaya": { surya: 8.0, wind: 6.5, geo: 1.5, hydro: 1.0 }, // Angin sedang
    "makassar": { surya: 8.5, wind: 7.0, geo: 2.0, hydro: 3.0 }, // Angin cukup baik
    "medan": { surya: 7.0, wind: 2.0, geo: 4.0, hydro: 7.0 },
    "umum": { surya: 7.0, wind: 4.0, geo: 3.0, hydro: 3.0 } // Default jika lokasi tidak ditemukan
};

// Data Biaya Asumsi (costPerKwh adalah Estimasi biaya investasi awal per kWh kapasitas terpasang)
const dataTeknologi = {
    "Surya": { costPerKwh: 3000, spaceFactor: 1.5, efficiency: 0.90, modalId: '#suryaModal' }, 
    "Angin": { costPerKwh: 4500, spaceFactor: 2.5, efficiency: 0.85, modalId: '#anginModal' },
    "Geotermal": { costPerKwh: 6000, spaceFactor: 0.5, efficiency: 0.95, modalId: '#geotermalModal' },
    "Hidro": { costPerKwh: 5500, spaceFactor: 3.0, efficiency: 0.92, modalId: '#hidrogenModal' } 
};

/**
 * --- 2. Fungsi Utama: Menghitung Rekomendasi (Simulasi Energi) ---
 */
function hitungRekomendasi(lokasiInput, konsumsi, anggaran, ruang) {
    
    const lokasiKey = lokasiInput.toLowerCase().trim();
    const dataLokasi = dataLingkungan[lokasiKey] || dataLingkungan["umum"];
    const hasilSkor = [];

    for (const tech in dataTeknologi) {
        const techData = dataTeknologi[tech];
        
        // --- A. Hitung Kelayakan Lingkungan (F_T) ---
        let F_T = 0;
        
        if (tech === "Surya") {
            F_T = dataLokasi.surya;
            if (ruang === "terbatas") F_T *= 0.5; 
        } else if (tech === "Angin") {
            F_T = dataLokasi.wind;
            if (ruang === "atap" || ruang === "terbatas") F_T *= 0.4;
        } else if (tech === "Geotermal") {
            F_T = dataLokasi.geo;
            if (ruang === "terbatas") F_T *= 1.1; 
        } else if (tech === "Hidro") {
            F_T = dataLokasi.hydro;
            if (ruang !== "lahan") F_T *= 0.3;
        }

        // --- B. Hitung Kelayakan Kebutuhan (N_T) ---
        // Asumsi: kapasitasKebutuhan = estimasi kapasitas sistem yang dibutuhkan (dalam watt) untuk konsumsi bulanan.
        // Disederhanakan: kapasitasKebutuhan * costPerKwh = Total Estimasi Biaya Proyek
        const kapasitasKebutuhan = konsumsi * 12; // Estimasi kebutuhan tahunan (sangat disederhanakan)
        const E_Cost_Numeric = (kapasitasKebutuhan / techData.efficiency) * techData.costPerKwh; 

        let N_T = 1.0; 
        const rasioAnggaran = anggaran / E_Cost_Numeric;

        if (rasioAnggaran < 0.5) {
            N_T = 0.5; 
        } else if (rasioAnggaran < 1.0) {
            N_T = 0.8; 
        } else if (rasioAnggaran >= 2.0) {
            N_T = 1.2; 
        }

        // --- C. Hitung Skor Prioritas Total (P_T) ---
        // P_T = (Kelayakan Lingkungan * Bobot) + (Kelayakan Kebutuhan * Bobot)
        const P_T = (F_T * 0.6) + ((N_T * 10) * 0.4); 

        hasilSkor.push({
            teknologi: tech,
            skor: P_T,
            F_T: F_T.toFixed(2), 
            N_T: N_T.toFixed(2), 
            E_Cost: E_Cost_Numeric, // Simpan sebagai angka untuk pemrosesan
            modalId: techData.modalId
        });
    }

    hasilSkor.sort((a, b) => b.skor - a.skor);
    return hasilSkor;
}


// --- 3. Logika Visualisasi Data Energi (Menggunakan Chart.js) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 3A. Render Grafik Default Saat Halaman Dimuat ---
    function renderDefaultChart() {
        const ctx = document.getElementById('defaultLoadProfileChart');
        if (!ctx) return; 

        const labels = ['00', '03', '06', '09', '12', '15', '18', '21'];
        // Data Khas Rumah Tangga: Rendah malam, naik pagi, rendah siang, puncak malam
        const dataKWh = [2.5, 2.0, 3.5, 4.0, 3.0, 5.0, 8.5, 6.0]; 

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Konsumsi Rata-Rata (kWh/periode 3 jam)',
                    data: dataKWh,
                    borderColor: '#007bff', 
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: '#dc3545' 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'kWh' }
                    },
                    x: {
                        title: { display: true, text: 'Waktu (Jam)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                }
            }
        });
    }

    renderDefaultChart();

    // --- 4. Listener Event Formulir & Logic Utama SIMULASI ENERGI ---

    const formSimulasi = document.querySelector('#simulasi form');
    const hasilDiv = document.getElementById('hasil-simulasi');

    if (formSimulasi) {
        formSimulasi.addEventListener('submit', function(e) {
            e.preventDefault();

            const lokasiInput = document.getElementById('lokasi').value;
            const konsumsiInput = parseFloat(document.getElementById('konsumsi').value);
            const anggaranInput = parseFloat(document.getElementById('anggaran').value);
            const ruangInput = document.getElementById('ruang').value;

            if (!lokasiInput || isNaN(konsumsiInput) || isNaN(anggaranInput) || konsumsiInput <= 0 || anggaranInput <= 0) {
                hasilDiv.innerHTML = `<div class="alert alert-danger" role="alert">
                    <h5 class="alert-heading">Input Tidak Valid!</h5>
                    <p>Mohon lengkapi semua bidang dengan nilai numerik yang positif.</p>
                </div>`;
                hasilDiv.style.display = 'block';
                hasilDiv.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            const hasil = hitungRekomendasi(lokasiInput, konsumsiInput, anggaranInput, ruangInput);
            const rekomendasiUtama = hasil[0];
            const rekomendasiSekunder = hasil[1];

            // Konversi E_Cost ke format mata uang
            const E_Cost_Formatted = rekomendasiUtama.E_Cost.toLocaleString('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 0});
            
            // Analisis Biaya
            let pesanAnggaran, alertClass;
            const rasioAnggaran = anggaranInput / rekomendasiUtama.E_Cost; 

            if (rasioAnggaran >= 1.0) {
                pesanAnggaran = `<span class="text-success fw-bold">Anggaran Anda sangat memadai!</span> Anda memiliki sisa anggaran yang bisa digunakan untuk penyimpanan energi (baterai).`;
                alertClass = 'success';
            } else if (rasioAnggaran >= 0.8) {
                 pesanAnggaran = `<span class="text-warning fw-bold">Anggaran Anda cukup baik.</span> Namun, Anda mungkin perlu melakukan penyesuaian skala proyek atau mencari tambahan dana.`;
                 alertClass = 'warning';
            } else {
                 pesanAnggaran = `<span class="text-danger fw-bold">Anggaran kurang.</span> Biaya investasi (${E_Cost_Formatted}) melebihi anggaran yang tersedia. Pertimbangkan pinjaman hijau atau sistem skala yang lebih kecil.`;
                 alertClass = 'danger';
            }

            let outputHTML = `
                <h4 class="text-success mb-4">🥇 Hasil Rekomendasi Utama Anda:</h4>
                
                <div class="alert alert-${alertClass} shadow-sm">
                    <h5 class="alert-heading fw-bold">${rekomendasiUtama.teknologi}</h5>
                    <p>Teknologi ini paling optimal berdasarkan ketersediaan **Lingkungan** dan **Kebutuhan** di lokasi **${lokasiInput}**.</p>
                    <div class="row pt-2">
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li><strong>Konsumsi:</strong> ${konsumsiInput.toLocaleString()} kWh/bulan</li>
                                <li><strong>Ruang:</strong> ${ruangInput.charAt(0).toUpperCase() + ruangInput.slice(1)}</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Skor Prioritas Total:</strong> <span class="badge bg-success">${rekomendasiUtama.skor.toFixed(2)} / 10</span></p>
                            <p class="mb-1">Kelayakan Lingkungan (F): ${rekomendasiUtama.F_T}</p>
                            <p class="mb-1">Kelayakan Anggaran (N): ${rekomendasiUtama.N_T}</p>
                        </div>
                    </div>
                </div>

                <h5 class="text-info mt-4">💰 Analisis Biaya:</h5>
                <ul>
                    <li>Anggaran Investasi Anda: <strong>US$${anggaranInput.toLocaleString('en-US', {minimumFractionDigits: 0})}</strong></li>
                    <li>Estimasi Biaya Proyek: <strong>${E_Cost_Formatted}</strong></li>
                    <li class="mt-2">${pesanAnggaran}</li>
                </ul>

                <h5 class="text-secondary mt-4">🥈 Rekomendasi Sekunder:</h5>
                <p>Pilihan kedua yang layak adalah **${rekomendasiSekunder.teknologi}** dengan Skor: <strong>${rekomendasiSekunder.skor.toFixed(2)}</strong>. Pertimbangkan ini sebagai alternatif atau pelengkap.</p>

                <p class="mt-4 text-center">
                    <button type="button" class="btn btn-lg btn-success" data-bs-toggle="modal" data-bs-target="${rekomendasiUtama.modalId}">
                        Pelajari Lebih Lanjut tentang ${rekomendasiUtama.teknologi}
                    </button>
                </p>
            `;

            hasilDiv.innerHTML = outputHTML;
            hasilDiv.style.display = 'block';
            hasilDiv.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- 4B. Logika Modal Visualisasi (Buatkan Grafik Anda Sendiri) ---

    const formGrafik = document.getElementById('data-grafik-form');
    // Di HTML lama, Anda memiliki #customLoadProfileChart di visualisasi modal
    // Di kode baru ini, Anda mencoba membuat canvas baru dengan ID #myEnergyChart.
    // Kita akan menggunakan #customLoadProfileChart yang sudah ada di HTML lama.
    const ctxCustom = document.getElementById('customLoadProfileChart');
    let customChart = null; 

    // Inisialisasi Chart Kustom pertama kali
    if (ctxCustom) {
        const defaultLabels = ['00:00 - 04:00', '04:00 - 08:00', '08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00 (Puncak)', '20:00 - 00:00'];
        const defaultData = [2.0, 4.5, 3.0, 5.0, 7.5, 6.0]; // Ambil data default dari HTML lama (jam1-jam6)

        customChart = new Chart(ctxCustom, {
            type: 'line', 
            data: {
                labels: defaultLabels,
                datasets: [{
                    label: 'Konsumsi Energi (kWh)',
                    data: defaultData,
                    borderColor: '#198754', 
                    backgroundColor: 'rgba(25, 135, 84, 0.2)',
                    tension: 0.3, 
                    fill: true,
                    pointBackgroundColor: '#dc3545' 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'kWh' }
                    },
                    x: {
                        title: { display: true, text: 'Waktu' }
                    }
                },
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Profil Beban Harian Anda (kWh)' }
                }
            }
        });
    }

    if (formGrafik) {
        formGrafik.addEventListener('submit', function(e) {
            e.preventDefault();

            // 1. Ambil data dari input form (kWh)
            const dataKonsumsi = [
                parseFloat(document.getElementById('jam1').value),
                parseFloat(document.getElementById('jam2').value),
                parseFloat(document.getElementById('jam3').value),
                parseFloat(document.getElementById('jam4').value),
                parseFloat(document.getElementById('jam5').value),
                parseFloat(document.getElementById('jam6').value)
            ];

            // Hitung total dan perbarui teks
            const total = dataKonsumsi.reduce((sum, current) => sum + current, 0);
            const totalHarianElement = document.getElementById('totalHarian');
            if (totalHarianElement) {
                totalHarianElement.textContent = total.toFixed(1);
            }
            
            // 2. Perbarui data Chart yang sudah diinisialisasi
            if (customChart) {
                customChart.data.datasets[0].data = dataKonsumsi;
                customChart.update();
            }
        });
    }

    // --- 5. Logika Simulasi Chat AI (dari Skrip HTML sebelumnya) ---

    const aiQuestionForm = document.getElementById('aiQuestionForm');

    if (aiQuestionForm) {
        aiQuestionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const input = document.getElementById('aiQuestionInput');
            const question = input.value.trim();
            const chatHistory = document.getElementById('chatHistory');
            
            // Tampilkan pertanyaan pengguna
            chatHistory.innerHTML += `<div class="p-2 mb-2 text-end bg-light rounded shadow-sm"><strong>Anda:</strong> ${question}</div>`;
            
            // Logika respons sederhana (Placeholder)
            let answer = "Maaf, saat ini saya hanya dapat memberikan jawaban sederhana. Silakan tanyakan hal-hal terkait **Surya, Angin, Geotermal, atau LCOE**.";
            
            const lowerQuestion = question.toLowerCase();

            if (lowerQuestion.includes('surya') || lowerQuestion.includes('fotovoltaik') || lowerQuestion.includes('plts')) {
                answer = "Energi Surya (PLTS) mengubah cahaya matahari menjadi listrik. Efisiensi panel komersial berkisar antara 15% hingga 22%. Tantangan utamanya adalah intermitensi (tidak ada produksi pada malam hari).";
            } else if (lowerQuestion.includes('angin') || lowerQuestion.includes('turbin')) {
                answer = "Energi Angin memanfaatkan energi kinetik angin menggunakan turbin. Kecepatan angin minimum untuk operasi komersial adalah sekitar 3-4 m/s. Turbin lepas pantai menawarkan hasil yang lebih stabil.";
            } else if (lowerQuestion.includes('geotermal') || lowerQuestion.includes('panas bumi')) {
                answer = "Energi Geotermal memanfaatkan panas bumi. Keunggulan utamanya adalah ia menyediakan daya 'baseload' (stabil 24/7), tidak seperti surya dan angin.";
            } else if (lowerQuestion.includes('lcoe') || lowerQuestion.includes('biaya energi')) {
                answer = "LCOE (Levelized Cost of Energy) adalah metrik yang digunakan untuk membandingkan total biaya sistem pembangkitan energi (termasuk investasi, operasi, dan bahan bakar) dibagi dengan total energi listrik yang dihasilkan sepanjang masa pakainya. Ini sangat penting untuk perencanaan investasi.";
            } else if (lowerQuestion.includes('smart grid') || lowerQuestion.includes('jaringan cerdas') || lowerQuestion.includes('mpc')) {
                answer = "Smart Grid adalah jaringan listrik yang menggunakan teknologi komunikasi digital. Model Predictive Control (MPC) adalah algoritma kuncinya untuk mengoptimalkan pasokan dan permintaan secara real-time.";
            } else if (lowerQuestion.includes('iot') || lowerQuestion.includes('sensor')) {
                answer = "IoT (Internet of Things) digunakan untuk monitoring energi secara real-time. Anda bisa menggunakan mikrokontroler seperti Arduino atau ESP32 untuk mengumpulkan data konsumsi dan mengirimkannya ke cloud.";
            }

            // Tampilkan respons AI
            setTimeout(() => {
                chatHistory.innerHTML += `<div class="p-2 mb-2 text-start bg-success text-white rounded shadow-sm"><strong>AI:</strong> ${answer}</div>`;
                chatHistory.scrollTop = chatHistory.scrollHeight; // Gulir ke bawah
                input.value = ''; // Kosongkan input
            }, 800); 
        });
    }
});