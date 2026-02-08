/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

import { changePanel, accountSelect, database, Slider, config, setStatus, popup, appdata, setBackground, getAvailableBackgrounds, getMergedInstanceList, createCustomInstance } from '../utils.js'
const { ipcRenderer } = require('electron');
const os = require('os');

class Settings {
    static id = "settings";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.navBTN()
        this.accounts()
        this.ram()
        this.javaPath()
        this.resolution()
        this.launcher()
        this.backgrounds()
        this.instances()
    }

    navBTN() {
        document.querySelector('.nav-box').addEventListener('click', e => {
            if (e.target.classList.contains('nav-settings-btn')) {
                let id = e.target.id

                let activeSettingsBTN = document.querySelector('.active-settings-BTN')
                let activeContainerSettings = document.querySelector('.active-container-settings')

                if (id == 'save') {
                    if (activeSettingsBTN) activeSettingsBTN.classList.toggle('active-settings-BTN');
                    document.querySelector('#account').classList.add('active-settings-BTN');

                    if (activeContainerSettings) activeContainerSettings.classList.toggle('active-container-settings');
                    document.querySelector(`#account-tab`).classList.add('active-container-settings');
                    return changePanel('home')
                }

                if (activeSettingsBTN) activeSettingsBTN.classList.toggle('active-settings-BTN');
                e.target.classList.add('active-settings-BTN');

                if (activeContainerSettings) activeContainerSettings.classList.toggle('active-container-settings');
                document.querySelector(`#${id}-tab`).classList.add('active-container-settings');
            }
        })
    }

    accounts() {
        document.querySelector('.accounts-list').addEventListener('click', async e => {
            let popupAccount = new popup()
            try {
                let id = e.target.id
                if (e.target.classList.contains('account')) {
                    popupAccount.openPopup({
                        title: 'Connexion',
                        content: 'Veuillez patienter...',
                        color: 'var(--color)'
                    })

                    if (id == 'add') {
                        document.querySelector('.cancel-home').style.display = 'inline'
                        return changePanel('login')
                    }

                    let account = await this.db.readData('accounts', id);
                    let configClient = await this.setInstance(account);
                    await accountSelect(account);
                    configClient.account_selected = account.ID;
                    return await this.db.updateData('configClient', configClient);
                }

                if (e.target.classList.contains("delete-profile")) {
                    popupAccount.openPopup({
                        title: 'Connexion',
                        content: 'Veuillez patienter...',
                        color: 'var(--color)'
                    })
                    await this.db.deleteData('accounts', id);
                    let deleteProfile = document.getElementById(`${id}`);
                    let accountListElement = document.querySelector('.accounts-list');
                    accountListElement.removeChild(deleteProfile);

                    if (accountListElement.children.length == 1) return changePanel('login');

                    let configClient = await this.db.readData('configClient');

                    if (configClient.account_selected == id) {
                        let allAccounts = await this.db.readAllData('accounts');
                        configClient.account_selected = allAccounts[0].ID
                        accountSelect(allAccounts[0]);
                        let newInstanceSelect = await this.setInstance(allAccounts[0]);
                        configClient.instance_selct = newInstanceSelect.instance_selct
                        return await this.db.updateData('configClient', configClient);
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                popupAccount.closePopup();
            }
        })
    }

    async setInstance(auth) {
        let configClient = await this.db.readData('configClient')
        let instanceSelect = configClient.instance_selct
        let instancesList = await getMergedInstanceList(this.db)

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth.name)
                if (whitelist !== auth.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        configClient.instance_selct = newInstanceSelect.name
                        await setStatus(newInstanceSelect.status)
                    }
                }
            }
        }
        return configClient
    }

    async ram() {
        let config = await this.db.readData('configClient');
        let totalMem = Math.trunc(os.totalmem() / 1073741824 * 10) / 10;
        let freeMem = Math.trunc(os.freemem() / 1073741824 * 10) / 10;

        document.getElementById("total-ram").textContent = `${totalMem} Go`;
        document.getElementById("free-ram").textContent = `${freeMem} Go`;

        let sliderDiv = document.querySelector(".memory-slider");
        sliderDiv.setAttribute("max", Math.trunc((80 * totalMem) / 100));

        let ram = config?.java_config?.java_memory ? {
            ramMin: config.java_config.java_memory.min,
            ramMax: config.java_config.java_memory.max
        } : { ramMin: "1", ramMax: "2" };

        if (totalMem < ram.ramMin) {
            config.java_config.java_memory = { min: 1, max: 2 };
            this.db.updateData('configClient', config);
            ram = { ramMin: "1", ramMax: "2" }
        };

        let slider = new Slider(".memory-slider", parseFloat(ram.ramMin), parseFloat(ram.ramMax));

        let minSpan = document.querySelector(".slider-touch-left span");
        let maxSpan = document.querySelector(".slider-touch-right span");

        minSpan.setAttribute("value", `${ram.ramMin} Go`);
        maxSpan.setAttribute("value", `${ram.ramMax} Go`);

        slider.on("change", async (min, max) => {
            let config = await this.db.readData('configClient');
            minSpan.setAttribute("value", `${min} Go`);
            maxSpan.setAttribute("value", `${max} Go`);
            config.java_config.java_memory = { min: min, max: max };
            this.db.updateData('configClient', config);
        });
    }

    async javaPath() {
        let javaPathText = document.querySelector(".java-path-txt")
        javaPathText.textContent = `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}/runtime`;

        let configClient = await this.db.readData('configClient')
        let javaPath = configClient?.java_config?.java_path || 'Utiliser la version de java livre avec le launcher';
        let javaPathInputTxt = document.querySelector(".java-path-input-text");
        let javaPathInputFile = document.querySelector(".java-path-input-file");
        javaPathInputTxt.value = javaPath;

        document.querySelector(".java-path-set").addEventListener("click", async () => {
            javaPathInputFile.value = '';
            javaPathInputFile.click();
            await new Promise((resolve) => {
                let interval;
                interval = setInterval(() => {
                    if (javaPathInputFile.value != '') resolve(clearInterval(interval));
                }, 100);
            });

            if (javaPathInputFile.value.replace(".exe", '').endsWith("java") || javaPathInputFile.value.replace(".exe", '').endsWith("javaw")) {
                let configClient = await this.db.readData('configClient')
                let file = javaPathInputFile.files[0].path;
                javaPathInputTxt.value = file;
                configClient.java_config.java_path = file
                await this.db.updateData('configClient', configClient);
            } else alert("Le nom du fichier doit être java ou javaw");
        });

        document.querySelector(".java-path-reset").addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            javaPathInputTxt.value = 'Utiliser la version de java livre avec le launcher';
            configClient.java_config.java_path = null
            await this.db.updateData('configClient', configClient);
        });
    }

    async resolution() {
        let configClient = await this.db.readData('configClient')
        let resolution = configClient?.game_config?.screen_size || { width: 1920, height: 1080 };

        let width = document.querySelector(".width-size");
        let height = document.querySelector(".height-size");
        let resolutionReset = document.querySelector(".size-reset");

        width.value = resolution.width;
        height.value = resolution.height;

        width.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.width = width.value;
            await this.db.updateData('configClient', configClient);
        })

        height.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size.height = height.value;
            await this.db.updateData('configClient', configClient);
        })

        resolutionReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.game_config.screen_size = { width: '854', height: '480' };
            width.value = '854';
            height.value = '480';
            await this.db.updateData('configClient', configClient);
        })
    }

    async launcher() {
        let configClient = await this.db.readData('configClient');

        let maxDownloadFiles = configClient?.launcher_config?.download_multi || 5;
        let maxDownloadFilesInput = document.querySelector(".max-files");
        let maxDownloadFilesReset = document.querySelector(".max-files-reset");
        maxDownloadFilesInput.value = maxDownloadFiles;

        maxDownloadFilesInput.addEventListener("change", async () => {
            let configClient = await this.db.readData('configClient')
            configClient.launcher_config.download_multi = maxDownloadFilesInput.value;
            await this.db.updateData('configClient', configClient);
        })

        maxDownloadFilesReset.addEventListener("click", async () => {
            let configClient = await this.db.readData('configClient')
            maxDownloadFilesInput.value = 5
            configClient.launcher_config.download_multi = 5;
            await this.db.updateData('configClient', configClient);
        })

        let themeBox = document.querySelector(".theme-box");
        let theme = configClient?.launcher_config?.theme || "auto";

        if (theme == "auto") {
            document.querySelector('.theme-btn-auto').classList.add('active-theme');
        } else if (theme == "dark") {
            document.querySelector('.theme-btn-sombre').classList.add('active-theme');
        } else if (theme == "light") {
            document.querySelector('.theme-btn-clair').classList.add('active-theme');
        }

        themeBox.addEventListener("click", async e => {
            if (e.target.classList.contains('theme-btn')) {
                let activeTheme = document.querySelector('.active-theme');
                if (e.target.classList.contains('active-theme')) return
                activeTheme?.classList.remove('active-theme');

                if (e.target.classList.contains('theme-btn-auto')) {
                    setBackground();
                    theme = "auto";
                    e.target.classList.add('active-theme');
                } else if (e.target.classList.contains('theme-btn-sombre')) {
                    setBackground(true);
                    theme = "dark";
                    e.target.classList.add('active-theme');
                } else if (e.target.classList.contains('theme-btn-clair')) {
                    setBackground(false);
                    theme = "light";
                    e.target.classList.add('active-theme');
                }

                let configClient = await this.db.readData('configClient')
                configClient.launcher_config.theme = theme;
                await this.db.updateData('configClient', configClient);
            }
        })

        let closeBox = document.querySelector(".close-box");
        let closeLauncher = configClient?.launcher_config?.closeLauncher || "close-launcher";

        if (closeLauncher == "close-launcher") {
            document.querySelector('.close-launcher').classList.add('active-close');
        } else if (closeLauncher == "close-all") {
            document.querySelector('.close-all').classList.add('active-close');
        } else if (closeLauncher == "close-none") {
            document.querySelector('.close-none').classList.add('active-close');
        }

        closeBox.addEventListener("click", async e => {
            if (e.target.classList.contains('close-btn')) {
                let activeClose = document.querySelector('.active-close');
                if (e.target.classList.contains('active-close')) return
                activeClose?.classList.toggle('active-close');

                let configClient = await this.db.readData('configClient')

                if (e.target.classList.contains('close-launcher')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-launcher";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-all')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-all";
                    await this.db.updateData('configClient', configClient);
                } else if (e.target.classList.contains('close-none')) {
                    e.target.classList.toggle('active-close');
                    configClient.launcher_config.closeLauncher = "close-none";
                    await this.db.updateData('configClient', configClient);
                }
            }
        })
    }

    async backgrounds() {
        const { ipcRenderer } = require('electron');
        let configClient = await this.db.readData('configClient') || {};
        if (!configClient.launcher_config) configClient.launcher_config = {};
        if (configClient.launcher_config.background == null) configClient.launcher_config.background = 'random';
        if (configClient.launcher_config.background_custom_path == null) configClient.launcher_config.background_custom_path = null;

        const theme = configClient?.launcher_config?.theme || 'auto';
        const isDark = theme === 'dark' || (theme === 'auto' && await ipcRenderer.invoke('is-dark-theme', theme));
        const availableBg = getAvailableBackgrounds(isDark);

        const container = document.getElementById('background-previews');
        container.innerHTML = '';
        availableBg.forEach(file => {
            const div = document.createElement('div');
            div.className = 'background-preview' + (configClient.launcher_config.background === file ? ' active-background' : '');
            div.dataset.background = file;
            div.style.backgroundImage = `url(./assets/images/background/${isDark ? 'dark' : 'light'}/${file})`;
            div.title = file;
            container.appendChild(div);
        });

        document.querySelectorAll('.background-option[data-background]').forEach(el => {
            if (el.dataset.background === configClient.launcher_config.background) el.classList.add('active-background');
        });

        const updateActive = (value) => {
            document.querySelectorAll('.background-option, .background-preview').forEach(el => el.classList.remove('active-background'));
            document.querySelector(`.background-option[data-background="${value}"]`)?.classList.add('active-background');
            document.querySelector(`.background-preview[data-background="${value}"]`)?.classList.add('active-background');
        };

        document.querySelector('.background-box').addEventListener('click', async e => {
            const opt = e.target.closest('.background-option[data-background]');
            const preview = e.target.closest('.background-preview');
            if (opt && opt.dataset.background !== 'custom') {
                configClient = await this.db.readData('configClient');
                configClient.launcher_config.background = opt.dataset.background;
                configClient.launcher_config.background_custom_path = null;
                await this.db.updateData('configClient', configClient);
                updateActive(opt.dataset.background);
                await setBackground();
            } else if (preview) {
                configClient = await this.db.readData('configClient');
                configClient.launcher_config.background = preview.dataset.background;
                configClient.launcher_config.background_custom_path = null;
                await this.db.updateData('configClient', configClient);
                updateActive(preview.dataset.background);
                await setBackground();
            }
        });

        const fileInput = document.querySelector('.background-file-input');
        const customBtn = document.querySelector('.background-custom-btn');
        customBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const destPath = await ipcRenderer.invoke('save-custom-background', file.path);
                configClient = await this.db.readData('configClient');
                configClient.launcher_config.background = 'custom';
                configClient.launcher_config.background_custom_path = destPath;
                await this.db.updateData('configClient', configClient);
                updateActive('custom');
                await setBackground();
            } catch (err) {
                console.error(err);
                alert('Impossible de charger l\'image personnalisée.');
            }
            fileInput.value = '';
        });
    }

    async instances() {
        const listEl = document.getElementById('custom-instances-list');
        const addBtn = document.querySelector('.add-instance-btn');
        const popup = document.getElementById('instance-form-popup');
        const closeBtn = document.getElementById('close-instance-form');
        const cancelBtn = document.querySelector('.instance-form-cancel');
        const saveBtn = document.querySelector('.instance-form-save');
        const loaderTypeSelect = document.querySelector('.instance-loader-type');

        const renderInstances = async () => {
            let configClient = await this.db.readData('configClient') || {};
            const custom = configClient.custom_instances || [];
            listEl.innerHTML = '';
            custom.forEach(inst => {
                const card = document.createElement('div');
                card.className = 'instance-card custom-instance';
                card.innerHTML = `
                    <div class="instance-card-name">${inst.name}</div>
                    <div class="instance-card-info">Minecraft ${inst.loadder?.minecraft_version || '?'} - ${inst.loadder?.loadder_type === 'none' ? 'Vanilla' : inst.loadder?.loadder_type}</div>
                    <button class="instance-card-delete" data-name="${inst.name}">Supprimer</button>
                `;
                listEl.appendChild(card);
            });
        };

        loaderTypeSelect.addEventListener('change', () => {
            document.querySelector('.instance-loader-version').disabled = loaderTypeSelect.value === 'none';
        });

        addBtn.addEventListener('click', () => {
            document.querySelector('.instance-name').value = '';
            document.querySelector('.instance-version').value = '1.20.4';
            document.querySelector('.instance-loader-type').value = 'none';
            document.querySelector('.instance-loader-version').value = 'latest';
            document.querySelector('.instance-loader-version').disabled = true;
            document.querySelector('.instance-url').value = '';
            document.querySelector('.instance-server-ip').value = '';
            document.querySelector('.instance-server-port').value = '25565';
            document.querySelector('.instance-server-name').value = '';
            popup.classList.add('show');
        });

        const closeForm = () => popup.classList.remove('show');
        closeBtn.addEventListener('click', closeForm);
        cancelBtn.addEventListener('click', closeForm);

        saveBtn.addEventListener('click', async () => {
            const name = document.querySelector('.instance-name').value.trim();
            if (!name) {
                alert('Veuillez entrer un nom pour l\'instance.');
                return;
            }
            let configClient = await this.db.readData('configClient') || {};
            configClient.custom_instances = configClient.custom_instances || [];
            if (configClient.custom_instances.some(i => i.name === name)) {
                alert('Une instance avec ce nom existe déjà.');
                return;
            }
            const newInstance = createCustomInstance({
                name,
                minecraft_version: document.querySelector('.instance-version').value || '1.20.4',
                loader_type: document.querySelector('.instance-loader-type').value,
                loader_version: document.querySelector('.instance-loader-version').value || 'latest',
                url: document.querySelector('.instance-url').value || null,
                server_ip: document.querySelector('.instance-server-ip').value || 'localhost',
                server_port: parseInt(document.querySelector('.instance-server-port').value) || 25565,
                server_name: document.querySelector('.instance-server-name').value || name
            });
            configClient.custom_instances.push(newInstance);
            await this.db.updateData('configClient', configClient);
            await renderInstances();
            closeForm();
        });

        listEl.addEventListener('click', async e => {
            if (e.target.classList.contains('instance-card-delete')) {
                const name = e.target.dataset.name;
                if (!confirm(`Supprimer l'instance "${name}" ?`)) return;
                let configClient = await this.db.readData('configClient') || {};
                configClient.custom_instances = (configClient.custom_instances || []).filter(i => i.name !== name);
                if (configClient.instance_selct === name) {
                    const all = await getMergedInstanceList(this.db);
                    configClient.instance_selct = all.find(i => i.name !== name)?.name || null;
                }
                await this.db.updateData('configClient', configClient);
                await renderInstances();
            }
        });

        await renderInstances();
    }
}
export default Settings;