/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
const { AZauth, Mojang, Microsoft } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import AzuriomAuth from '../utils/azuriomAuth.js';
import { popup, database, changePanel, accountSelect, addAccount, config, setStatus, getMergedInstanceList } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        if (typeof this.config.online == 'boolean') {
            this.config.online ? this.getLoginOptions() : this.getCrack()
        } else if (typeof this.config.online == 'string') {
            if (this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
                this.getAZauth();
            }
        }
        
        document.querySelector('.cancel-home')?.addEventListener('click', () => {
            document.querySelector('.cancel-home').style.display = 'none'
            changePanel('settings')
        })
    }

    async getLoginOptions() {
        console.log('Initializing login options...');
        let loginOptions = document.querySelector('.login-options-panel');
        if (loginOptions) loginOptions.style.display = 'block';
        
        // Microsoft login button
        let microsoftBtn = document.querySelector('.connect-microsoft');
        if (microsoftBtn) {
            microsoftBtn.addEventListener('click', () => {
                this.startMicrosoftLogin();
            });
        }
        
        // Azuriom login button
        let azuriomBtn = document.querySelector('.connect-azuriom');
        if (azuriomBtn) {
            azuriomBtn.addEventListener('click', () => {
                if (loginOptions) loginOptions.style.display = 'none';
                this.getAzuriom();
            });
        }
    }

    async startMicrosoftLogin() {
        console.log('Starting Microsoft login...');
        let popupLogin = new popup();
        
        popupLogin.openPopup({
            title: 'Connexion',
            content: 'Veuillez patienter...',
            color: 'var(--color)'
        });

        ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
            if (account_connect == 'cancel' || !account_connect) {
                popupLogin.closePopup();
                return;
            } else {
                await this.saveData(account_connect)
                popupLogin.closePopup();
            }
        }).catch(err => {
            popupLogin.openPopup({
                title: 'Erreur',
                content: err,
                options: true
            });
        });
    }

    async getAzuriom() {
        console.log('Initializing Azuriom login...');
        let azuriomUrl = this.config.azuriom_url || 'https://craftpick.fr';
        let azuriomClient = new AzuriomAuth(azuriomUrl);
        let PopupLogin = new popup();
        
        let loginAzuriom = document.querySelector('.login-azuriom');
        let loginAzuriom2FA = document.querySelector('.login-azuriom-2fa');

        if (loginAzuriom) loginAzuriom.style.display = 'block';

        let azuriomEmail = document.querySelector('.email-azuriom');
        let azuriomPassword = document.querySelector('.password-azuriom');
        let azuriom2FAInput = document.querySelector('.code-2fa-azuriom');
        let connectAzuriomBtn = document.querySelector('.connect-azuriom-btn');
        let connect2FABtn = document.querySelector('.connect-2fa-azuriom-btn');
        let cancelAzuriomBtn = document.querySelector('.cancel-azuriom');
        let cancel2FABtn = document.querySelector('.cancel-2fa-azuriom');
        let backToOptionsBtn = document.querySelector('.back-to-options');

        // Back button
        if (backToOptionsBtn) {
            backToOptionsBtn.addEventListener('click', () => {
                if (loginAzuriom) loginAzuriom.style.display = 'none';
                let loginOptions = document.querySelector('.login-options-panel');
                if (loginOptions) loginOptions.style.display = 'block';
            });
        }

        // Cancel buttons
        if (cancelAzuriomBtn) {
            cancelAzuriomBtn.addEventListener('click', () => {
                if (loginAzuriom) loginAzuriom.style.display = 'none';
                let loginOptions = document.querySelector('.login-options-panel');
                if (loginOptions) loginOptions.style.display = 'block';
            });
        }

        if (cancel2FABtn) {
            cancel2FABtn.addEventListener('click', () => {
                if (loginAzuriom2FA) loginAzuriom2FA.style.display = 'none';
                if (loginAzuriom) loginAzuriom.style.display = 'block';
            });
        }

        // Main login button
        if (connectAzuriomBtn) {
            connectAzuriomBtn.addEventListener('click', async () => {
                PopupLogin.openPopup({
                    title: 'Connexion en cours...',
                    content: 'Veuillez patienter...',
                    color: 'var(--color)'
                });

                if (!azuriomEmail?.value || !azuriomPassword?.value) {
                    PopupLogin.openPopup({
                        title: 'Erreur',
                        content: 'Veuillez remplir tous les champs.',
                        options: true
                    });
                    return;
                }

                let azuriomConnect = await azuriomClient.login(azuriomEmail.value, azuriomPassword.value);

                if (azuriomConnect.error) {
                    PopupLogin.openPopup({
                        title: 'Erreur',
                        content: azuriomConnect.message,
                        options: true
                    });
                    return;
                }

                if (azuriomConnect.requires2fa) {
                    if (loginAzuriom) loginAzuriom.style.display = 'none';
                    if (loginAzuriom2FA) loginAzuriom2FA.style.display = 'block';
                    PopupLogin.closePopup();
                    return;
                }

                if (azuriomConnect.status === 'success') {
                    await this.saveData(this.formatAzuriomData(azuriomConnect));
                    PopupLogin.closePopup();
                }
            });
        }

        // 2FA validation button
        if (connect2FABtn) {
            connect2FABtn.addEventListener('click', async () => {
                PopupLogin.openPopup({
                    title: 'Connexion en cours...',
                    content: 'Veuillez patienter...',
                    color: 'var(--color)'
                });

                if (!azuriom2FAInput?.value) {
                    PopupLogin.openPopup({
                        title: 'Erreur',
                        content: 'Veuillez entrer le code 2FA.',
                        options: true
                    });
                    return;
                }

                let azuriomConnect = await azuriomClient.login(
                    azuriomEmail.value, 
                    azuriomPassword.value, 
                    azuriom2FAInput.value
                );

                if (azuriomConnect.error) {
                    PopupLogin.openPopup({
                        title: 'Erreur',
                        content: azuriomConnect.message,
                        options: true
                    });
                    return;
                }

                if (azuriomConnect.status === 'success') {
                    await this.saveData(this.formatAzuriomData(azuriomConnect));
                    PopupLogin.closePopup();
                }
            });
        }
    }

    formatAzuriomData(data) {
        return {
            access_token: data.access_token,
            client_token: data.uuid, // Utiliser UUID comme client token
            uuid: data.uuid,
            name: data.username,
            user_properties: {},
            meta: {
                type: 'azuriom',
                online: false, // Azuriom n'est pas une auth Minecraft officielle
                demo: false,
                uuid: data.uuid
            }
        };
    }

    async getMicrosoft() {
        console.log('Initializing Microsoft login...');
        let popupLogin = new popup();
        let loginHome = document.querySelector('.login-home');
        let microsoftBtn = document.querySelector('.connect-home');
        if (loginHome) loginHome.style.display = 'block';

        if (microsoftBtn) {
            microsoftBtn.addEventListener("click", () => {
                popupLogin.openPopup({
                    title: 'Connexion',
                    content: 'Veuillez patienter...',
                    color: 'var(--color)'
                });

                ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
                    if (account_connect == 'cancel' || !account_connect) {
                        popupLogin.closePopup();
                        return;
                    } else {
                        await this.saveData(account_connect)
                        popupLogin.closePopup();
                    }
                }).catch(err => {
                    popupLogin.openPopup({
                        title: 'Erreur',
                        content: err,
                        options: true
                    });
                });
            });
        }
    }

    async getCrack() {
        console.log('Initializing offline login...');
        let popupLogin = new popup();
        let loginOffline = document.querySelector('.login-offline');

        let emailOffline = document.querySelector('.email-offline');
        let connectOffline = document.querySelector('.connect-offline');
        loginOffline.style.display = 'block';

        connectOffline.addEventListener('click', async () => {
            if (emailOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo doit faire au moins 3 caractères.',
                    options: true
                });
                return;
            }

            if (emailOffline.value.match(/ /g)) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo ne doit pas contenir d\'espaces.',
                    options: true
                });
                return;
            }

            let MojangConnect = await Mojang.login(emailOffline.value);

            if (MojangConnect.error) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: MojangConnect.message,
                    options: true
                });
                return;
            }
            await this.saveData(MojangConnect)
            popupLogin.closePopup();
        });
    }

    async getAZauth() {
        console.log('Initializing AZauth login...');
        let AZauthClient = new AZauth(this.config.online);
        let PopupLogin = new popup();
        let loginAZauth = document.querySelector('.login-AZauth');
        let loginAZauthA2F = document.querySelector('.login-AZauth-A2F');

        let AZauthEmail = document.querySelector('.email-AZauth');
        let AZauthPassword = document.querySelector('.password-AZauth');
        let AZauthA2F = document.querySelector('.A2F-AZauth');
        let connectAZauthA2F = document.querySelector('.connect-AZauth-A2F');
        let AZauthConnectBTN = document.querySelector('.connect-AZauth');
        let AZauthCancelA2F = document.querySelector('.cancel-AZauth-A2F');

        loginAZauth.style.display = 'block';

        AZauthConnectBTN.addEventListener('click', async () => {
            PopupLogin.openPopup({
                title: 'Connexion en cours...',
                content: 'Veuillez patienter...',
                color: 'var(--color)'
            });

            if (AZauthEmail.value == '' || AZauthPassword.value == '') {
                PopupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Veuillez remplir tous les champs.',
                    options: true
                });
                return;
            }

            let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

            if (AZauthConnect.error) {
                PopupLogin.openPopup({
                    title: 'Erreur',
                    content: AZauthConnect.message,
                    options: true
                });
                return;
            } else if (AZauthConnect.A2F) {
                loginAZauthA2F.style.display = 'block';
                loginAZauth.style.display = 'none';
                PopupLogin.closePopup();

                AZauthCancelA2F.addEventListener('click', () => {
                    loginAZauthA2F.style.display = 'none';
                    loginAZauth.style.display = 'block';
                });

                connectAZauthA2F.addEventListener('click', async () => {
                    PopupLogin.openPopup({
                        title: 'Connexion en cours...',
                        content: 'Veuillez patienter...',
                        color: 'var(--color)'
                    });

                    if (AZauthA2F.value == '') {
                        PopupLogin.openPopup({
                            title: 'Erreur',
                            content: 'Veuillez entrer le code A2F.',
                            options: true
                        });
                        return;
                    }

                    AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2F.value);

                    if (AZauthConnect.error) {
                        PopupLogin.openPopup({
                            title: 'Erreur',
                            content: AZauthConnect.message,
                            options: true
                        });
                        return;
                    }

                    await this.saveData(AZauthConnect)
                    PopupLogin.closePopup();
                });
            } else if (!AZauthConnect.A2F) {
                await this.saveData(AZauthConnect)
                PopupLogin.closePopup();
            }
        });
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData)
        let instanceSelect = configClient.instance_selct
        let instancesList = await getMergedInstanceList(this.db)
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name)
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        configClient.instance_selct = newInstanceSelect.name
                        await setStatus(newInstanceSelect.status)
                    }
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('home');
    }
}
export default Login;