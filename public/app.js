document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando componentes...');
    
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
    const exceptionInput = document.getElementById('exception');
    const sessionStatusInput = document.getElementById('session-status');

    let editingLessonId = null;
    let isPrivate = true;
    let monthlyChart = null;
    let weeklyChart = null;
    let dayOfWeekChart = null;
    let monthlyFinanceChart = null;
    let currentMonthDoughnut = null;

    let comparisonChart = null;
    let avgTicketChart = null;
    let openLessonsChart = null;
    let playersChart = null;
    let lessonTypeChart = null;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Plugin para mostrar valores nos pontos/barras
    const pointValuePlugin = {
        id: 'pointValuePlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom'; 
            data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((datapoint, index) => {
                    let val = dataset.data[index];
                    if (chart.canvas.id === 'monthlyFinanceChart' || chart.canvas.id === 'avgTicketChart') {
                        val = isPrivate ? '£ ****' : '£' + (typeof val === 'number' ? val.toFixed(2) : val);
                        if (chart.canvas.id === 'monthlyFinanceChart') val = isPrivate ? '£ ****' : '£' + Math.round(dataset.data[index]);
                    }
                    ctx.fillText(val, datapoint.x, datapoint.y - 5);
                });
            });
            ctx.restore();
        }
    };

    // Plugin para mostrar valores e porcentagem dentro da rosca
    const doughnutLabelsPlugin = {
        id: 'doughnutLabelsPlugin',
        afterDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';

            const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

            chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                const { x, y } = datapoint.tooltipPosition();
                const value = data.datasets[0].data[index];
                const percentage = Math.round((value / total) * 100);
                
                if (value > 0) {
                    ctx.fillText(`${value} (${percentage}%)`, x, y);
                }
            });
            ctx.restore();
        }
    };

    document.getElementById('toggle-privacy-btn')?.addEventListener('click', (e) => {
        isPrivate = !isPrivate;
        e.target.textContent = isPrivate ? '👁️' : '🕶️';
        
        // Recarregar a aba atual para aplicar a privacidade
        const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');
        if (activeTab === 'dashboard') loadDashboard();
        if (activeTab === 'graphics') updateGraphics();
        
        showToast(isPrivate ? 'Values hidden' : 'Values visible');
    });

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
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        document.getElementById('date').value = today;
        
        // Default dates for bulk filter (current month)
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Helper to format date as YYYY-MM-DD using local time to avoid timezone shifts
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const bulkStartInput = document.getElementById('bulk-start');
        const bulkEndInput = document.getElementById('bulk-end');
        if (bulkStartInput) bulkStartInput.value = formatDate(firstDay);
        if (bulkEndInput) bulkEndInput.value = formatDate(lastDay);

        startTimeInput.value = '12:00';
        durationInput.value = '1';
        valueInput.value = '25';
        modelInput.value = 'KG Academy';
        lessonTypeInput.value = 'Private';
        playersInput.value = '1-1';
        paymentMethodInput.value = 'App';
        paymentOtherGroup.classList.add('hidden');
        paymentStatusInput.value = 'Waiting';
        exceptionInput.value = 'Normal';
        sessionStatusInput.value = 'Planned';
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
            
            const titles = { dashboard: 'Dashboard', insert: 'Insert Lesson', records: 'My Records', graphics: 'Performance', regtab: 'Full Records', data: 'Manage Data', bulk: 'Bulk Actions' };
            tabTitle.textContent = titles[targetTab];
            if (targetTab === 'dashboard') loadDashboard();
            if (targetTab === 'records') loadLessons();
            if (targetTab === 'graphics') updateGraphics();
            if (targetTab === 'regtab') loadRegTab();
        });
    });

    // RegTab Logic
    let currentSort = { column: 'date', direction: 'desc' };
    
    async function loadRegTab() {
        const res = await fetch('/api/lessons');
        const lessons = await res.json();
        renderFullTable(lessons);
    }

    function renderFullTable(lessons) {
        const body = document.getElementById('full-table-body');
        
        // Sort data
        const sorted = [...lessons].sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];
            
            // Handle numeric values
            if (['duration', 'coach_value', 'total_value'].includes(currentSort.column)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        body.innerHTML = sorted.map(l => `
            <tr onclick="startEdit(${JSON.stringify(l).replace(/"/g, '&quot;')})" style="cursor: pointer;">
                <td>${l.id}</td>
                <td>${l.date}</td>
                <td>${l.start_time}</td>
                <td>${l.duration}h</td>
                <td>£${parseFloat(l.coach_value).toFixed(2)}</td>
                <td>£${parseFloat(l.total_value).toFixed(2)}</td>
                <td>${l.name || ''}</td>
                <td>${l.model || ''}</td>
                <td>${l.peak_type || ''}</td>
                <td>${l.lesson_type || ''}</td>
                <td>${l.players_count || ''}</td>
                <td>${l.payment_method || ''}</td>
                <td>${l.payment_status || ''}</td>
                <td>${l.session_status || 'Planned'}</td>
                <td>${l.exception || ''}</td>
                <td>${l.general_note || ''}</td>
            </tr>
        `).join('');
    }

    document.querySelectorAll('#full-table-header th').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            
            // Update UI indicators
            document.querySelectorAll('#full-table-header th').forEach(h => {
                const col = h.getAttribute('data-sort');
                h.textContent = h.textContent.replace(/[↕↑↓]/g, '').trim() + ' ' + 
                    (col === currentSort.column ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕');
            });

            loadRegTab();
        });
    });

    // Bulk Actions
    const bulkFilterBtn = document.getElementById('bulk-filter-btn');
    const bulkUpdateBtn = document.getElementById('bulk-update-btn');
    const bulkUpdateSection = document.getElementById('bulk-update-section');
    const btnShowBulkUpdate = document.getElementById('btn-show-bulk-update');
    const bulkActionTriggerContainer = document.getElementById('bulk-action-trigger-container');
    let filteredResults = [];

    bulkFilterBtn?.addEventListener('click', async () => {
        try {
            const start = document.getElementById('bulk-start').value;
            const end = document.getElementById('bulk-end').value;
            const filterName = document.getElementById('bulk-name').value.toLowerCase();
            const filterPayStatus = document.getElementById('filter-bulk-pay-status').value;
            const filterSessStatus = document.getElementById('filter-bulk-session-status').value;
            const filterDuration = document.getElementById('filter-bulk-duration').value;
            const filterModel = document.getElementById('filter-bulk-model').value;
            const filterPlayers = document.getElementById('filter-bulk-players').value;
            const filterPeak = document.getElementById('filter-bulk-peak').value;

            if (!start || !end) {
                return showToast('Please select both start and end dates.', 'error');
            }

            const res = await fetch('/api/lessons');
            if (!res.ok) throw new Error('Failed to fetch lessons');
            const lessons = await res.json();

            filteredResults = lessons.filter(l => {
                if (!l.date) return false;
                const lessonDate = l.date.split('T')[0]; 
                const matchesDate = (lessonDate >= start) && (lessonDate <= end);
                const matchesName = !filterName || (l.name || '').toLowerCase().includes(filterName);
                const matchesPay = !filterPayStatus || l.payment_status === filterPayStatus;
                const matchesSess = !filterSessStatus || l.session_status === filterSessStatus;
                const matchesDuration = !filterDuration || parseFloat(l.duration) === parseFloat(filterDuration);
                const matchesModel = !filterModel || l.model === filterModel;
                const matchesPlayers = !filterPlayers || l.players_count === filterPlayers;
                const matchesPeak = !filterPeak || l.peak_type === filterPeak;
                
                return matchesDate && matchesName && matchesPay && matchesSess && 
                       matchesDuration && matchesModel && matchesPlayers && matchesPeak;
            });

            // Hide action containers when filtering again
            bulkActionTriggerContainer?.classList.add('hidden');
            bulkUpdateSection?.classList.add('hidden');

            renderBulkPreview(filteredResults);
            
            if (filteredResults.length === 0) {
                showToast('Nenhum registro encontrado para este período.', 'warning');
            } else {
                showToast(`Encontrados ${filteredResults.length} registros.`);
            }
        } catch (err) {
            console.error(err);
            showToast('Error filtering records: ' + err.message, 'error');
        }
    });

    function renderBulkPreview(results) {
        document.getElementById('bulk-count').textContent = results.length;
        const body = document.getElementById('bulk-preview-body');
        const selectAllCheckbox = document.getElementById('bulk-select-all');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        if (results.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="17" style="text-align: center; padding: 20px; color: #666;">
                        Nenhum registro encontrado para a busca realizada.
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = results.map(l => {
            const isEditable = l.session_status === 'Planned' || l.session_status === 'Completed';
            const totalValue = l.coach_value * l.duration;
            return `
                <tr style="${isEditable ? '' : 'opacity: 0.5; background: #f9f9f9;'}">
                    <td>
                        <input type="checkbox" class="bulk-item-checkbox" data-id="${l.id}" ${isEditable ? '' : 'disabled'}>
                    </td>
                    <td>${l.id}</td>
                    <td>${l.date}</td>
                    <td>${l.start_time || ''}</td>
                    <td>${l.duration}h</td>
                    <td>${isPrivate ? '***' : l.coach_value}</td>
                    <td>${isPrivate ? '***' : totalValue}</td>
                    <td>${l.name || ''} ${isEditable ? '' : '<small>(Non-editable)</small>'}</td>
                    <td>${l.model || ''}</td>
                    <td>${l.peak_type || ''}</td>
                    <td>${l.lesson_type || ''}</td>
                    <td>${l.players_count || ''}</td>
                    <td>${l.payment_method || ''}</td>
                    <td>${l.payment_status}</td>
                    <td>${l.session_status}</td>
                    <td>${l.exception || ''}</td>
                    <td>${l.general_note || ''}</td>
                </tr>
            `;
        }).join('');

        // Listen for checkbox changes to show/hide the trigger button
        document.querySelectorAll('.bulk-item-checkbox').forEach(cb => {
            cb.addEventListener('change', updateBulkActionTriggerVisibility);
        });
        selectAllCheckbox?.addEventListener('change', () => {
            // Give it a tiny delay to ensure all checkboxes are updated by the other listener
            setTimeout(updateBulkActionTriggerVisibility, 50);
        });
    }

    function updateBulkActionTriggerVisibility() {
        const anyChecked = document.querySelectorAll('.bulk-item-checkbox:checked').length > 0;
        if (anyChecked) {
            bulkActionTriggerContainer?.classList.remove('hidden');
        } else {
            bulkActionTriggerContainer?.classList.add('hidden');
            bulkUpdateSection?.classList.add('hidden');
        }
    }

    btnShowBulkUpdate?.addEventListener('click', () => {
        bulkUpdateSection?.classList.remove('hidden');
        btnShowBulkUpdate.scrollIntoView({ behavior: 'smooth' });
    });

    // Event listener for Select All
    document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.bulk-item-checkbox:not(:disabled)').forEach(cb => {
            cb.checked = isChecked;
        });
    });

    bulkUpdateBtn?.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.bulk-item-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.getAttribute('data-id')));

        if (selectedIds.length === 0) return showToast('Nenhum registro selecionado para alteração.', 'warning');
        
        const payStatus = document.getElementById('bulk-pay-status').value;
        const sessStatus = document.getElementById('bulk-session-status').value;
        
        if (!payStatus && !sessStatus) return showToast('Selecione ao menos uma alteração para aplicar.', 'warning');

        if (!confirm(`Aplicar alterações a ${selectedIds.length} registros selecionados?`)) return;
        
        try {
            // Find the full lesson objects for the selected IDs
            const lessonsToUpdate = filteredResults.filter(l => selectedIds.includes(l.id));

            for (const l of lessonsToUpdate) {
                const updated = {
                    ...l,
                    payment_status: payStatus || l.payment_status,
                    session_status: sessStatus || l.session_status
                };
                await fetch(`/api/lessons/${l.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated)
                });
            }
            
            showToast('Atualização em massa concluída!');
            bulkUpdateSection?.classList.add('hidden');
            bulkActionTriggerContainer?.classList.add('hidden');
            // Clear selections
            document.getElementById('bulk-select-all').checked = false;
            loadLessons(); // Refresh data
        } catch (err) {
            showToast('Erro durante a atualização em massa: ' + err.message, 'error');
        }
    });

    async function checkSession() {
        try {
            const res = await fetch('/api/check-session');
            const data = await res.json();
            if (data.loggedIn) {
                showDashboard();
            } else {
                showLogin();
            }
        } catch (err) {
            showLogin();
        }
    }

    checkSession();
    setDefaultValues();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) { 
                showDashboard(); 
                showToast('Welcome back!'); 
            } else {
                const errorData = await res.json();
                showToast(errorData.error || 'Invalid credentials.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        }
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
            general_note: generalNoteInput.value,
            exception: exceptionInput.value,
            session_status: sessionStatusInput.value
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
            coach_value: normalizeNumber(document.getElementById('pay-amount').value) / lesson.duration,
            payment_method: document.getElementById('pay-method').value,
            payment_status: document.getElementById('pay-status').value,
            players_count: document.getElementById('pay-players').value,
            session_status: document.getElementById('pay-session-status').value
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

    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        loadDashboard();
    }

    async function loadDashboard() {
        const res = await fetch('/api/lessons');
        const lessons = await res.json();
        renderCurrentMonthDoughnut(lessons);
    }

    function renderCurrentMonthDoughnut(lessons) {
        if (typeof Chart === 'undefined') return;

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const today = now.toISOString().split('T')[0];

        // Rótulo amigável para o mês
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('current-month-label').textContent = `${monthNames[now.getMonth()]} ${currentYear}`;

        const monthLessons = lessons.filter(l => {
            const [y, m] = l.date.split('-');
            return parseInt(y) === currentYear && parseInt(m) === currentMonth;
        });

        const pastLessons = monthLessons.filter(l => l.date <= today);
        const futureLessons = monthLessons.filter(l => l.date > today);
        
        const pastCount = pastLessons.length;
        const futureCount = futureLessons.length;
        const totalCount = monthLessons.length;

        const pastRevenue = pastLessons.reduce((sum, l) => sum + (parseFloat(l.total_value) || 0), 0);
        const futureRevenue = futureLessons.reduce((sum, l) => sum + (parseFloat(l.total_value) || 0), 0);
        const totalRevenue = pastRevenue + futureRevenue;

        const formatCurrency = (val) => isPrivate ? '£ ****' : `£ ${val.toFixed(2)}`;

        document.getElementById('month-stats-summary').innerHTML = ''; 

        document.getElementById('month-financial-summary').innerHTML = `
            <div style="font-size: 0.9rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Total Investment</div>
            <div style="font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 15px;">${formatCurrency(totalRevenue)}</div>
            <div style="display: flex; justify-content: space-around; padding: 10px; background: #f9f9f9; border-radius: 12px;">
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: #888;">PAST</div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: #1976d2;">${formatCurrency(pastRevenue)}</div>
                </div>
                <div style="width: 1px; background: #ddd; margin: 0 10px;"></div>
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: #888;">UPCOMING</div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: #4caf50;">${formatCurrency(futureRevenue)}</div>
                </div>
            </div>
        `;
        const ctx = document.getElementById('currentMonthDoughnut').getContext('2d');
        if (currentMonthDoughnut) currentMonthDoughnut.destroy();
        
        const next7Days = new Date();
        next7Days.setDate(now.getDate() + 7);
        const next7DaysStr = next7Days.toISOString().split('T')[0];

        const upcomingSessions = lessons.filter(l => {
            return l.date >= today && l.date <= next7DaysStr;
        }).sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

        const upcomingList = document.getElementById('upcoming-7days-list');
        if (upcomingSessions.length === 0) {
            upcomingList.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9rem;">No sessions scheduled for the next 7 days.</p>';
        } else {
            upcomingList.innerHTML = upcomingSessions.map(l => {
                const dateParts = l.date.split('-');
                const d = new Date(l.date + 'T12:00:00');
                const dayName = daysOfWeek[d.getDay()];
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fdfdfd; border-radius: 10px; border-left: 4px solid #4caf50; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div style="flex: 1;">
                            <span style="font-weight: bold; color: #333; font-size: 0.95rem;">${dayName}</span>
                            <span style="color: #888; font-size: 0.8rem; margin-left: 5px;">${dateParts[2]}/${dateParts[1]}</span>
                        </div>
                        <div style="flex: 2; text-align: right; font-weight: 500; color: var(--primary);">
                            ${l.name || 'Anonymous'} <span style="font-size: 0.75rem; color: #999;">(${l.start_time})</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        currentMonthDoughnut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Past', 'Upcoming'],
                datasets: [{
                    data: [pastCount, futureCount],
                    backgroundColor: ['#1976d2', '#4caf50'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false 
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                cutout: '70%'
            },
            plugins: [{
                id: 'centerText',
                afterDraw(chart) {
                    const { ctx, width, height } = chart;
                    ctx.save();
                    ctx.font = 'bold 28px sans-serif';
                    ctx.fillStyle = '#333';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(totalCount, width / 2, height / 2 - 10);
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillStyle = '#888';
                    ctx.fillText('LESSONS', width / 2, height / 2 + 15);
                    ctx.font = 'bold 14px sans-serif';
                    ctx.fillStyle = '#1976d2';
                    ctx.textAlign = 'right';
                    ctx.fillText(pastCount, width / 2 - 45, height / 2 + 5);
                    ctx.font = '9px sans-serif';
                    ctx.fillText('PAST', width / 2 - 45, height / 2 + 18);
                    ctx.font = 'bold 14px sans-serif';
                    ctx.fillStyle = '#4caf50';
                    ctx.textAlign = 'left';
                    ctx.fillText(futureCount, width / 2 + 45, height / 2 + 5);
                    ctx.font = '9px sans-serif';
                    ctx.fillText('FUTURE', width / 2 + 45, height / 2 + 18);
                    ctx.restore();
                }
            }]
        });
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

        const today = new Date().toISOString().split('T')[0];
        const activeLessons = lessons.filter(l => (l.session_status || 'Planned') === 'Planned' || l.date > today);
        const historyLessons = lessons.filter(l => (l.session_status || 'Planned') === 'Completed' && l.date <= today);

        let html = '';
        if (activeLessons.length > 0) {
            html += '<h3 style="margin-top: 10px; padding-left: 10px; color: var(--primary);">Planned & Upcoming</h3>';
            html += renderTable(activeLessons);
        }
        if (historyLessons.length > 0) {
            html += '<h3 style="margin-top: 20px; padding-left: 10px; color: #666;">Completed & Past</h3>';
            html += renderTable(historyLessons);
        }
        lessonsList.innerHTML = html;
    }

    function renderTable(lessonList) {
        let tableHTML = `
            <div class="records-table">
                <div class="record-row records-header">
                    <div class="record-cell">Date/Time</div>
                    <div class="record-cell">Info/Name</div>
                    <div class="record-cell" style="text-align:right">Total</div>
                    <div class="record-cell"></div>
                </div>
        `;
        tableHTML += lessonList.map(l => {
            const [h, m] = (l.start_time || '12:00').split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0);
            d.setMinutes(d.getMinutes() + (l.duration * 60));
            const endT = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            let statusColor = '#d32f2f'; 
            const status = (l.payment_status || '').toLowerCase();
            if (status === 'done' || status === 'kevin' || status === 'paid') statusColor = '#1976d2'; 
            return `
                <div class="record-row">
                    <div class="record-cell cell-date">
                        <small style="color:var(--primary); font-weight: bold;">ID: ${l.id}</small><br>
                        ${formatDate(l.date, true)}<br>
                        <small style="color:#888">${l.start_time || '12:00'} - ${endT}</small>
                    </div>
                    <div class="record-cell cell-details">
                        <strong>${l.name || 'N/A'}</strong> <small style="color:${statusColor}">(${l.payment_status})</small><br>
                        ${l.duration}h x £${l.coach_value} (${l.payment_method || 'N/A'})<br>
                        <small style="color:#888;">${l.players_count || '1-1'} Players, ${l.peak_type || 'Peak'} (${l.lesson_type || 'Private'})</small>
                    </div>
                    <div class="record-cell cell-total">£${parseFloat(l.total_value).toFixed(2)}</div>
                    <div class="record-cell cell-actions">
                        <button class="btn-icon btn-pay" title="Complete/Pay" onclick="openPayModal(${JSON.stringify(l).replace(/"/g, '&quot;')})">✅</button>
                        <button class="btn-icon btn-pay" title="Update Payment" onclick="openPayModal(${JSON.stringify(l).replace(/"/g, '&quot;')})">💰</button>
                        <button class="btn-icon btn-edit" onclick="startEdit(${JSON.stringify(l).replace(/"/g, '&quot;')})">✎</button>
                        <button class="btn-icon btn-delete" onclick="deleteLesson(${l.id})">🗑</button>
                    </div>
                </div>
            `;
        }).join('');
        tableHTML += '</div>';
        return tableHTML;
    }

    window.openPayModal = (lesson) => {
        document.getElementById('pay-lesson-id').value = lesson.id;
        document.getElementById('pay-amount').value = parseFloat(lesson.total_value).toFixed(2);
        document.getElementById('pay-method').value = lesson.payment_method || 'App';
        document.getElementById('pay-status').value = 'Done';
        document.getElementById('pay-players').value = lesson.players_count || '1-1';
        document.getElementById('pay-session-status').value = 'Completed';
        payModal.classList.remove('hidden');
    };

    async function updateGraphics() {
        if (typeof Chart === 'undefined') return;
        const res = await fetch('/api/lessons');
        const allLessons = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const lessons = allLessons.filter(l => l.date <= today);

        if (allLessons.length === 0) return;
        renderComparisonChart(allLessons);
        
        if (lessons.length === 0) return;
        renderMonthlyChart(lessons);
        renderWeeklyChart(lessons);
        renderDayOfWeekChart(lessons);
        renderMonthlyFinanceChart(lessons);
        renderAvgTicketChart(lessons);
        renderOpenLessonsChart(lessons);
        renderPlayersChart(lessons);
        renderLessonTypeChart(lessons);
        renderStatsSummary(lessons);
    }

    function renderLessonTypeChart(lessons) {
        const typeData = { 'Private': 0, 'Open': 0 };
        lessons.forEach(l => {
            const type = (l.lesson_type || 'Private').includes('Open') ? 'Open' : 'Private';
            typeData[type]++;
        });

        const ctx = document.getElementById('lessonTypeChart').getContext('2d');
        if (lessonTypeChart) lessonTypeChart.destroy();
        lessonTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Private', 'Open'],
                datasets: [{
                    data: [typeData['Private'], typeData['Open']],
                    backgroundColor: ['#2e7d32', '#ffa726'],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            },
            plugins: [doughnutLabelsPlugin]
        });
    }

    function renderPlayersChart(lessons) {
        const playerData = {};
        lessons.forEach(l => {
            const players = l.players_count || '1-1';
            if (!playerData[players]) playerData[players] = 0;
            playerData[players]++;
        });

        const labels = Object.keys(playerData).sort();
        const ctx = document.getElementById('playersChart').getContext('2d');
        if (playersChart) playersChart.destroy();
        playersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Lessons',
                    data: labels.map(l => playerData[l]),
                    backgroundColor: '#42a5f5', 
                    borderRadius: 5
                }]
            },
            options: chartOptions(true),
            plugins: [pointValuePlugin]
        });
    }

    function renderOpenLessonsChart(lessons) {
        const monthlyData = {};
        const openLessons = lessons.filter(l => (l.lesson_type || '').toLowerCase().includes('open'));
        openLessons.forEach(l => {
            const [year, month] = l.date.split('-');
            const monthLabel = `${month}/${year}`;
            const key = `${year}-${month}`;
            if (!monthlyData[key]) monthlyData[key] = { label: monthLabel, count: 0 };
            monthlyData[key].count++;
        });
        const sortedKeys = Object.keys(monthlyData).sort();
        const ctx = document.getElementById('openLessonsChart').getContext('2d');
        if (openLessonsChart) openLessonsChart.destroy();
        openLessonsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedKeys.map(k => monthlyData[k].label),
                datasets: [{
                    label: 'Open Lessons',
                    data: sortedKeys.map(k => monthlyData[k].count),
                    backgroundColor: '#ffa726',
                    borderRadius: 5
                }]
            },
            options: chartOptions(true),
            plugins: [pointValuePlugin]
        });
    }

    function renderAvgTicketChart(lessons) {
        const monthlyData = {};
        lessons.forEach(l => {
            if (l.exception === 'Exception') return;
            const [year, month] = l.date.split('-');
            const monthLabel = `${month}/${year}`;
            const key = `${year}-${month}`;
            if (!monthlyData[key]) monthlyData[key] = { label: monthLabel, total: 0, count: 0 };
            monthlyData[key].total += l.total_value;
            monthlyData[key].count++;
        });
        const sortedKeys = Object.keys(monthlyData).sort();
        const ctx = document.getElementById('avgTicketChart').getContext('2d');
        if (avgTicketChart) avgTicketChart.destroy();
        avgTicketChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedKeys.map(k => monthlyData[k].label),
                datasets: [{
                    label: 'Avg Ticket (£)',
                    data: sortedKeys.map(k => (monthlyData[k].total / monthlyData[k].count)),
                    backgroundColor: '#1976d2',
                    borderRadius: 5
                }]
            },
            options: chartOptions(false),
            plugins: [pointValuePlugin]
        });
    }

    function renderComparisonChart(allLessons) {
        const today = new Date().toISOString().split('T')[0];
        const pastCount = allLessons.filter(l => l.date <= today).length;
        const futureCount = allLessons.filter(l => l.date > today).length;

        const ctx = document.getElementById('comparisonChart').getContext('2d');
        if (comparisonChart) comparisonChart.destroy();
        comparisonChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Past', 'Upcoming'],
                datasets: [{
                    data: [pastCount, futureCount],
                    backgroundColor: ['#666', '#2e7d32'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                cutout: '70%'
            },
            plugins: [doughnutLabelsPlugin]
        });
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
            options: chartOptions(true),
            plugins: [pointValuePlugin]
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
            options: chartOptions(true),
            plugins: [pointValuePlugin]
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

    function chartOptions(integerY = false) {
        return {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#eee' }, 
                    ticks: {
                        callback: function(value) {
                            if (integerY) return value;
                            return isPrivate ? '****' : '£' + value;
                        }
                    }
                }, 
                x: { grid: { display: false } } 
            }
        };
    }

    function renderStatsSummary(lessons) {
        const totalValue = lessons.reduce((sum, l) => sum + l.total_value, 0);
        const avgPerLesson = totalValue / lessons.length;
        const formatVal = (v) => isPrivate ? '£ ****' : `£${v.toFixed(2)}`;
        document.getElementById('stats-summary').innerHTML = `
            <div class="stats-row"><span>Total Investment:</span> <span class="stats-val">${formatVal(totalValue)}</span></div>
            <div class="stats-row"><span>Avg per Lesson:</span> <span class="stats-val">${formatVal(avgPerLesson)}</span></div>
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
        let pt = lesson.peak_type || 'Peak';
        if (pt.toLowerCase().includes('off')) pt = 'Off Peak';
        else if (pt.toLowerCase().includes('peak') || pt.toLowerCase().includes('premium')) pt = 'Peak';
        peakInput.value = pt;
        lessonTypeInput.value = lesson.lesson_type || 'Private';
        playersInput.value = lesson.players_count || '1-1';
        const standardMethods = ['Bank Transfer', 'Cash', 'Card', 'App', 'Voucher', 'Membership', 'Kevin Student', 'Playtomic', 'Myself'];
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
        exceptionInput.value = lesson.exception || '';
        sessionStatusInput.value = lesson.session_status || 'Planned';
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
        exceptionInput.value = 'Normal';
        sessionStatusInput.value = 'Planned';
    }

    function formatDate(dateStr, includeDay = false) {
        const parts = dateStr.split('-');
        const d = new Date(dateStr + 'T12:00:00');
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        return includeDay ? `${daysOfWeek[d.getDay()]}, ${formatted}` : formatted;
    }

    cancelEdit();
    console.log('App.js finalizado!');
});
