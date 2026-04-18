document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const lessonForm = document.getElementById('lesson-form');
    const payForm = document.getElementById('pay-form');
    const payModal = document.getElementById('pay-modal');
    
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const lessonsList = document.getElementById('lessons-list');
    const logoutBtn = document.getElementById('logout-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabTitle = document.getElementById('tab-title');
    const toastContainer = document.getElementById('toast-container');
    
    const valueInput = document.getElementById('value');
    const durationInput = document.getElementById('duration');
    const totalValueInput = document.getElementById('total-value');
    const nameInput = document.getElementById('name');
    const modelInput = document.getElementById('model');
    const peakInput = document.getElementById('peak-type');
    const lessonTypeInput = document.getElementById('lesson-type');
    const playersInput = document.getElementById('players');
    const paymentMethodInput = document.getElementById('payment-method');
    const paymentMethodOtherInput = document.getElementById('payment-method-other');
    const paymentOtherGroup = document.getElementById('payment-other-group');
    const paymentStatusInput = document.getElementById('payment-status');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const generalNoteInput = document.getElementById('general-note');

    let editingLessonId = null;
    let monthlyChart = null;
    let weeklyChart = null;
    let dayOfWeekChart = null;
    let monthlyFinanceChart = null;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        startTimeInput.value = '12:00';
        durationInput.value = '1';
        valueInput.value = '25';
        modelInput.value = 'KG Academy';
        lessonTypeInput.value = 'Private';
        playersInput.value = '1-1';
        paymentMethodInput.value = 'App';
        paymentOtherGroup.classList.add('hidden');
        paymentStatusInput.value = 'Pending';
        calculateTimes();
        calculateTotal();
        calculatePeakType();
    }

    paymentMethodInput.addEventListener('change', () => {
        if (paymentMethodInput.value === 'Other') paymentOtherGroup.classList.remove('hidden');
        else paymentOtherGroup.classList.add('hidden');
    });

    [startTimeInput, durationInput, valueInput, document.getElementById('date')].forEach(input => {
        input.addEventListener('input', () => {
            calculateTimes();
            calculateTotal();
            if (input.id === 'date' || input.id === 'start-time') calculatePeakType();
        });
    });

    function calculatePeakType() {
        const dateStr = document.getElementById('date').value;
        const startTime = startTimeInput.value;
        if (!dateStr || !startTime) return;
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDay();
        const hour = parseInt(startTime.split(':')[0]);
        if (day >= 1 && day <= 5 && hour < 17) peakInput.value = 'Off Peak';
        else peakInput.value = 'Peak';
    }

    function calculateTimes() {
        if (!startTimeInput.value || !durationInput.value) return;
        const [hours, minutes] = startTimeInput.value.split(':').map(Number);
        const duration = normalizeNumber(durationInput.value);
        const date = new Date();
        date.setHours(hours, minutes, 0);
        const endMinutes = date.getMinutes() + (duration * 60);
        date.setMinutes(endMinutes);
        const endH = date.getHours().toString().padStart(2, '0');
        const endM = date.getMinutes().toString().padStart(2, '0');
        endTimeInput.value = `${endH}:${endM}`;
    }

    function calculateTotal() {
        const val = parseFloat(valueInput.value.replace(',', '.')) || 0;
        const dur = parseFloat(durationInput.value.replace(',', '.')) || 0;
        const total = val * dur;
        totalValueInput.value = total > 0 ? `£ ${total.toFixed(2)}` : '';
    }

    function normalizeNumber(str) {
        if (!str) return 0;
        return parseFloat(str.toString().replace(',', '.'));
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            tabPanes.forEach(p => p.classList.add('hidden'));
            const targetPane = document.getElementById(`tab-${targetTab}`);
            targetPane.classList.remove('hidden');
            
            // Se for a aba de gráficos em tela grande, o CSS cuidará do display: grid
            // Mas precisamos garantir que as outras abas não tentem usar grid se não precisarem.
            
            const titles = { insert: 'Insert Lesson', records: 'My Records', graphics: 'Performance', data: 'Manage Data' };
            tabTitle.textContent = titles[targetTab];
            if (targetTab === 'records') loadLessons();
            if (targetTab === 'graphics') updateGraphics();
        });
    });

    // Data Management
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');

    exportBtn?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/export');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `padel_backup_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Backup downloaded!');
        } catch (err) {
            showToast('Error exporting data.', 'error');
        }
    });

    importBtn?.addEventListener('click', async () => {
        const file = importFileInput.files[0];
        if (!file) {
            showToast('Please select a file first.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csvData = e.target.result;
                const res = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/csv' },
                    body: csvData
                });
                
                if (res.ok) {
                    const result = await res.json();
                    showToast(result.message);
                    importFileInput.value = '';
                } else {
                    const error = await res.json();
                    showToast(error.error || 'Error importing data.', 'error');
                }
            } catch (err) {
                showToast('Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
    });

    checkSession();
    setDefaultValues();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (res.ok) { showDashboard(); showToast('Welcome back!'); }
        else showToast('Invalid username or password.', 'error');
    });

    lessonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let paymentMethodValue = paymentMethodInput.value;
        if (paymentMethodValue === 'Other') paymentMethodValue = paymentMethodOtherInput.value || 'Other';

        const lessonData = {
            date: document.getElementById('date').value,
            start_time: startTimeInput.value,
            name: nameInput.value,
            model: modelInput.value,
            peak_type: peakInput.value,
            lesson_type: lessonTypeInput.value,
            players_count: playersInput.value,
            payment_method: paymentMethodValue,
            payment_status: paymentStatusInput.value,
            coach_value: normalizeNumber(valueInput.value),
            duration: normalizeNumber(durationInput.value),
            general_note: generalNoteInput.value
        };

        const method = editingLessonId ? 'PUT' : 'POST';
        const url = editingLessonId ? `/api/lessons/${editingLessonId}` : '/api/lessons';
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lessonData)
        });
        if (res.ok) {
            cancelEdit();
            loadLessons();
            showToast(editingLessonId ? 'Lesson updated!' : 'Lesson registered!');
        } else {
            showToast('Error saving lesson.', 'error');
        }
    });

    // Quick Pay Logic
    payForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pay-lesson-id').value;
        const res = await fetch('/api/lessons');
        const lessons = await res.json();
        const lesson = lessons.find(l => l.id == id);
        
        if (!lesson) return;

        const updatedData = {
            ...lesson,
            coach_value: normalizeNumber(document.getElementById('pay-amount').value) / lesson.duration, // Mantendo a proporção rate/hour
            payment_method: document.getElementById('pay-method').value,
            payment_status: document.getElementById('pay-status').value
        };

        const putRes = await fetch(`/api/lessons/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (putRes.ok) {
            payModal.classList.add('hidden');
            loadLessons();
            showToast('Payment updated!');
        }
    });

    document.getElementById('close-pay-modal').addEventListener('click', () => payModal.classList.add('hidden'));

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        showLogin();
        showToast('Logged out successfully.');
    });

    async function checkSession() {
        const res = await fetch('/api/check-session');
        const data = await res.json();
        if (data.loggedIn) showDashboard();
        else showLogin();
    }

    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        loadLessons();
    }

    function showLogin() {
        dashboardScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }

    async function loadLessons() {
        const res = await fetch('/api/lessons');
        const lessons = await res.json();
        if (lessons.length === 0) {
            lessonsList.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px;">No lessons found.</p>';
            return;
        }
        let tableHTML = `
            <div class="records-table">
                <div class="record-row records-header">
                    <div class="record-cell">Date/Time</div>
                    <div class="record-cell">Info/Name</div>
                    <div class="record-cell" style="text-align:right">Total</div>
                    <div class="record-cell"></div>
                </div>
        `;
        tableHTML += lessons.map(l => {
            const [h, m] = (l.start_time || '12:00').split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0);
            d.setMinutes(d.getMinutes() + (l.duration * 60));
            const endT = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            
            let statusColor = '#d32f2f'; 
            if (l.payment_status === 'Paid') statusColor = '#2e7d32'; 
            if (l.payment_status === 'Partial') statusColor = '#ff9800'; 
            
            return `
                <div class="record-row">
                    <div class="record-cell cell-date">
                        ${formatDate(l.date, true)}<br>
                        <small style="color:#888">${l.start_time || '12:00'} - ${endT}</small>
                    </div>
                    <div class="record-cell cell-details">
                        <strong>${l.name || 'N/A'}</strong> <small style="color:${statusColor}">(${l.payment_status})</small><br>
                        ${l.duration}h x £${l.coach_value} (${l.payment_method || 'N/A'})<br>
                        <small style="color:#888;">${l.players_count || '1-1'} Players, ${l.peak_type || 'Peak'} (${l.lesson_type || 'Private'})</small>
                        ${l.general_note ? `<br><small style="color:#555; font-style: italic;">Note: ${l.general_note}</small>` : ''}
                    </div>
                    <div class="record-cell cell-total">£${parseFloat(l.total_value).toFixed(2)}</div>
                    <div class="record-cell cell-actions">
                        <button class="btn-icon btn-pay" onclick="openPayModal(${JSON.stringify(l).replace(/"/g, '&quot;')})">💰</button>
                        <button class="btn-icon btn-edit" onclick="startEdit(${JSON.stringify(l).replace(/"/g, '&quot;')})">✎</button>
                        <button class="btn-icon btn-delete" onclick="deleteLesson(${l.id})">🗑</button>
                    </div>
                </div>
            `;
        }).join('');
        tableHTML += '</div>';
        lessonsList.innerHTML = tableHTML;
    }

    window.openPayModal = (lesson) => {
        document.getElementById('pay-lesson-id').value = lesson.id;
        document.getElementById('pay-amount').value = parseFloat(lesson.total_value).toFixed(2);
        document.getElementById('pay-method').value = lesson.payment_method || 'App';
        document.getElementById('pay-status').value = 'Paid';
        payModal.classList.remove('hidden');
    };

    async function updateGraphics() {
        const res = await fetch('/api/lessons');
        const lessons = await res.json();
        if (lessons.length === 0) return;
        renderMonthlyChart(lessons);
        renderWeeklyChart(lessons);
        renderDayOfWeekChart(lessons);
        renderMonthlyFinanceChart(lessons);
        renderStatsSummary(lessons);
    }

    function renderMonthlyChart(lessons) {
        const monthlyData = {};
        lessons.forEach(l => {
            const [year, month] = l.date.split('-');
            const monthLabel = `${month}/${year}`;
            const key = `${year}-${month}`;
            if (!monthlyData[key]) monthlyData[key] = { label: monthLabel, count: 0 };
            monthlyData[key].count++;
        });
        const sortedKeys = Object.keys(monthlyData).sort();
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedKeys.map(k => monthlyData[k].label),
                datasets: [{
                    label: 'Number of Lessons',
                    data: sortedKeys.map(k => monthlyData[k].count),
                    borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.3
                }]
            },
            options: chartOptions(true),
            plugins: [pointValuePlugin]
        });
    }

    function renderWeeklyChart(lessons) {
        const weeklyData = {};
        lessons.forEach(l => {
            const d = new Date(l.date + 'T12:00:00');
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            const weekKey = monday.toISOString().split('T')[0];
            const weekLabel = `W/C ${monday.getDate()}/${monday.getMonth() + 1}`;
            if (!weeklyData[weekKey]) weeklyData[weekKey] = { label: weekLabel, count: 0 };
            weeklyData[weekKey].count++;
        });
        const sortedKeys = Object.keys(weeklyData).sort();
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedKeys.map(k => weeklyData[k].label),
                datasets: [{
                    label: 'Number of Lessons',
                    data: sortedKeys.map(k => weeklyData[k].count),
                    borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.3
                }]
            },
            options: chartOptions(true)
        });
    }

    function renderDayOfWeekChart(lessons) {
        const dayCount = [0, 0, 0, 0, 0, 0, 0];
        lessons.forEach(l => {
            const d = new Date(l.date + 'T12:00:00');
            dayCount[d.getDay()]++;
        });
        const reorderedLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const reorderedData = [dayCount[1], dayCount[2], dayCount[3], dayCount[4], dayCount[5], dayCount[6], dayCount[0]];
        const ctx = document.getElementById('dayOfWeekChart').getContext('2d');
        if (dayOfWeekChart) dayOfWeekChart.destroy();
        dayOfWeekChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: reorderedLabels,
                datasets: [{
                    label: 'Number of Lessons',
                    data: reorderedData,
                    backgroundColor: '#ff9800', borderRadius: 5
                }]
            },
            options: chartOptions(true)
        });
    }

    function renderMonthlyFinanceChart(lessons) {
        const monthlyFinance = {};
        lessons.forEach(l => {
            const [year, month] = l.date.split('-');
            const monthLabel = `${month}/${year}`;
            const key = `${year}-${month}`;
            if (!monthlyFinance[key]) monthlyFinance[key] = { label: monthLabel, total: 0 };
            monthlyFinance[key].total += l.total_value;
        });
        const sortedKeys = Object.keys(monthlyFinance).sort();
        const ctx = document.getElementById('monthlyFinanceChart').getContext('2d');
        if (monthlyFinanceChart) monthlyFinanceChart.destroy();
        monthlyFinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedKeys.map(k => monthlyFinance[k].label),
                datasets: [{
                    label: 'Total Investment (£)',
                    data: sortedKeys.map(k => monthlyFinance[k].total),
                    borderColor: '#9c27b0', backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.3
                }]
            },
            options: chartOptions(false),
            plugins: [pointValuePlugin]
        });
    }

    // Plugin para mostrar valores nos pontos
    const pointValuePlugin = {
        id: 'pointValuePlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((datapoint, index) => {
                    let val = dataset.data[index];
                    if (chart.canvas.id === 'monthlyFinanceChart') {
                        val = '£' + Math.round(val);
                    }
                    ctx.fillText(val, datapoint.x, datapoint.y + 7);
                });
            });
            ctx.restore();
        }
    };

    function chartOptions(integerY = false) {
        return {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: '#eee' }, ticks: integerY ? { stepSize: 1 } : {} }, 
                x: { grid: { display: false } } 
            }
        };
    }

    function renderStatsSummary(lessons) {
        const totalValue = lessons.reduce((sum, l) => sum + l.total_value, 0);
        const avgPerLesson = totalValue / lessons.length;
        document.getElementById('stats-summary').innerHTML = `
            <div class="stats-row"><span>Total Investment:</span> <span class="stats-val">£${totalValue.toFixed(2)}</span></div>
            <div class="stats-row"><span>Avg per Lesson:</span> <span class="stats-val">£${avgPerLesson.toFixed(2)}</span></div>
            <div class="stats-row"><span>Total Lessons:</span> <span class="stats-val">${lessons.length}</span></div>
        `;
    }

    window.deleteLesson = async (id) => {
        if (confirm('Delete this lesson?')) {
            const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
            if (res.ok) { loadLessons(); showToast('Lesson deleted.'); }
        }
    };

    window.startEdit = (lesson) => {
        editingLessonId = lesson.id;
        document.querySelector('[data-tab="insert"]').click();
        document.getElementById('date').value = lesson.date;
        startTimeInput.value = lesson.start_time || '12:00';
        durationInput.value = lesson.duration.toString();
        nameInput.value = lesson.name || '';
        modelInput.value = lesson.model || 'KG Academy';
        peakInput.value = lesson.peak_type || 'Peak';
        lessonTypeInput.value = lesson.lesson_type || 'Private';
        playersInput.value = lesson.players_count || '1-1';
        
        const standardMethods = ['Bank Transfer', 'Cash', 'Card', 'App', 'Voucher', 'Membership', 'Kevin Student'];
        if (standardMethods.includes(lesson.payment_method)) {
            paymentMethodInput.value = lesson.payment_method;
            paymentOtherGroup.classList.add('hidden');
        } else {
            paymentMethodInput.value = 'Other';
            paymentMethodOtherInput.value = lesson.payment_method || '';
            paymentOtherGroup.classList.remove('hidden');
        }
        
        paymentStatusInput.value = lesson.payment_status || 'Pending';
        valueInput.value = lesson.coach_value.toString();
        generalNoteInput.value = lesson.general_note || '';
        calculateTimes();
        calculateTotal();
        lessonForm.querySelector('button[type="submit"]').textContent = 'Save Changes';
        if (!document.getElementById('cancel-edit')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-edit';
            cancelBtn.className = 'btn-primary btn-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = cancelEdit;
            lessonForm.appendChild(cancelBtn);
        }
        lessonForm.parentElement.classList.add('editing-mode');
    };

    function cancelEdit() {
        editingLessonId = null;
        lessonForm.reset();
        setDefaultValues();
        lessonForm.querySelector('button[type="submit"]').textContent = 'Register Lesson';
        document.getElementById('cancel-edit')?.remove();
        lessonForm.parentElement.classList.remove('editing-mode');
    }

    function formatDate(dateStr, includeDay = false) {
        const parts = dateStr.split('-');
        const d = new Date(dateStr + 'T12:00:00');
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        return includeDay ? `${daysOfWeek[d.getDay()]}, ${formatted}` : formatted;
    }
});
