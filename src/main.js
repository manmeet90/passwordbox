
// Passwordbox component
class Passwordbox {

    constructor(){
        // console.log(process.env);
        console.log('passwordbox constructor');
        this.showCreateForm = false;
        this.secretKey = null;
        this.selectedRecord = null;
        this.isLoggedIn = false;
        this.baseUrl = 'https://passwordbox-api.glitch.me';
    }

    request(method, url, body) {
        const apiRequestUrl =`${this.baseUrl}${url}`;
        return new Promise((resolve, reject) => {
            fetch(apiRequestUrl, {
                method: method,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body): null
            })
            .then((response) => response.json())
            .then(response => {
                if(response.status !== 'error') {
                    resolve(response);
                } else {
                    reject(response);
                }
            })
            .catch(erroResponse => {
                reject(erroResponse);
            })
        }); 
        
    }

    initApp() {
        console.log("initApp called");
        // this.initDB();
        this.isLoggedIn = JSON.parse(sessionStorage.getItem('isLoggedIn'));
        if(this.isLoggedIn) {
            document.querySelector('#login-wizard').classList.add('hide');
            document.querySelector('#main-content').classList.remove('hide');
            this.loadConfig();
            this.loadList();
        } else {
            document.querySelector('#login-wizard').classList.remove('hide');
            document.querySelector('#main-content').classList.add('hide');
            document.querySelector('#login-btn').addEventListener('click', (e) => this.onLoginBtnClick(e));
        }
        
        this.mode = null;
        if(sessionStorage.getItem('secret-key')){
            this.secretKey = sessionStorage.getItem('secret-key');
        }
    }

    onLoginBtnClick(e) {
        e.preventDefault();
        document.querySelector('#login-error').classList.add('hide');
        const formData = new FormData(document.querySelector('#login-form'));
        this.login(formData.get('username'),formData.get('password'));
    }

    login(username, password) {
        if(username && password) {
            this.request('POST','/auth/login', {
                username,password
            })
            // firebase.auth().signInWithEmailAndPassword(username, password)
            .then(response => {
                if(response.data) {
                    // login successful
                    this.isLoggedIn = true;
                    sessionStorage.setItem('isLoggedIn', this.isLoggedIn);
                    document.querySelector('#login-wizard').classList.add('hide');
                    document.querySelector('#main-content').classList.remove('hide');
                    this.loadConfig();
                    this.loadList();
                }
            }).catch(err => {
                console.log(err);
                document.querySelector('#login-error').innerHTML = err?.errors[0]?.message || "Login failed.Try after some time.";
                document.querySelector('#login-error').classList.remove('hide');
            });
        }
    }

    initDB() {
        // Initialize Firebase
        var configObj = {
            apiKey: "QUl6YVN5QmRybHl2S0JKd2R5RjN1QkFKM2JYaFVmRkpUNG5pUEhR",
            authDomain: "cGFzc3dvcmRib3gtYmE0NzEuZmlyZWJhc2VhcHAuY29t",
            databaseURL: "aHR0cHM6Ly9wYXNzd29yZGJveC1iYTQ3MS5maXJlYmFzZWlvLmNvbQ==",
            projectId: "cGFzc3dvcmRib3gtYmE0NzE=",
            storageBucket: "cGFzc3dvcmRib3gtYmE0NzEuYXBwc3BvdC5jb20=",
            messagingSenderId: "OTIwNzYxMzc0MDk0"
        };
        let config = {};
        for(let key of Object.keys(configObj)){
            config[key] = atob(configObj[key]);
        }
        firebase.initializeApp(config);
        this.db = firebase.database();
    }

    createForm() {
        this.attachListeners();
    }

    attachListeners() {
        $('#createRecordBtn').off('click').on('click', (e) => {
            this.mode = 1;
        });

        $('#secretKeyBtn').off('click').on('click', (e) => {
            let value = prompt('Enter Secret Key');
            if(value && this.config) {
                this.secretKey = CryptoJS.AES.encrypt(value, this.config.superkey);
                sessionStorage.setItem('secret-key', this.secretKey);
            }
        });
        $('#passwrdDlg').on('shown.bs.modal',  (e) => {
            $('#title').val('');
            $('#paswrd').val('');
            $('#createBtn').off('click').on('click', (e) => {
                this.onCreateButtonClicked(e);
            });

            if(this.mode == 2) {
                let bytes  = CryptoJS.AES.decrypt(this.selectedRecord.password, this.getkeyToDecrypt(this.secretKey));
                let plaintext = bytes.toString(CryptoJS.enc.Utf8);
                $('#title').val(this.selectedRecord.title);
                $('#paswrd').val(plaintext);
            }
        });
        $('#passwrdDlg').on('hidden.bs.modal',  (e) => {
            this.selectedRecord = null;
        });

        document.querySelector('#logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    logout() {
        this.request('GET', '/auth/logout')
        .then(_ => {
            this.isLoggedIn = false;
            sessionStorage.clear();
            window.location.reload();
        });
    }

    onCreateButtonClicked(e) {
        e.preventDefault();
        let title = $('#createPasswordForm #title').val();
        let password = $('#createPasswordForm #paswrd').val();
        if(title && password) {
            if(this.secretKey) {
                this.saveData(title, password);
            }else {
                let secretKey = prompt('Enter the secret key for cipher');
                if(secretKey) {
                    this.secretKey = CryptoJS.AES.encrypt(secretKey, this.config.superkey);
                    sessionStorage.setItem('secret-key', this.secretKey);
                    this.saveData(title, password);
                }else {
                    alert('No secret key or incorrect secret key entered.Could not proceed.');
                }
            }
        }
    }

    getkeyToDecrypt(keyStr) {
        let bytes  = CryptoJS.AES.decrypt(keyStr, this.config.superkey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    saveData(title, password) {
        // let bytes  = CryptoJS.AES.decrypt(this.secretKey, this.config.superkey);
        // let key = bytes.toString(CryptoJS.enc.Utf8);
        let cipherText =  CryptoJS.AES.encrypt(password, this.getkeyToDecrypt(this.secretKey));
        let uuid = this.mode === 1 ? this.generateUUID(): this.selectedRecord.id;
        // this.db.ref(`passwords/${uuid}`).set({
        //     id: uuid,
        //     title: title,
        //     password: cipherText.toString()
        // });
        this.request('POST', '/info', {
            id: uuid,
            title: title,
            password: cipherText.toString()
        })
        .then(response => {
            if(response.data.saved) {
                this.loadList();
            }
        });
    }

    loadConfig() {
        // this.db.ref('configs').once('value')
        this.request('GET','/info/configs')
        .then(snapshot => {
            this.config = snapshot.data;
        });
    }

    loadList() {
        // this.db.ref('passwords').once('value')
        this.request('GET','/info')
        .then(snapshot => {
            let _data = snapshot.data;
            this.data = [];
            for(let key in _data) {
                this.data.push(_data[key]);
            }
            this.populateGrid(this.data);
            this.createForm();
        });
    }

    populateGrid(data) {
        let content = '';
        data.forEach( _data => {
            let row = _data;
            content += `<tr id='${row.id}'>
            <td>${row.title}</td>
            <td>${row.password.split('').fill('*').join('')}</td>
            <td>
                <button data-id='${row.id}' class='btn btn-xs btn-primary showPasswrdBtn'>Show Password</button>
                <button data-id='${row.id}' class='hide btn btn-xs btn-default hidePasswrdBtn'>Hide Password</button>
                <button data-id='${row.id}' class='btn btn-xs btn-danger deletePasswrdBtn'>Delete Record</button>
                <button data-id='${row.id}' class='btn btn-xs btn-success editPasswrdBtn'>Edit Record</button>
            </td>
            </tr>`;
        });
        $('#passwordList tbody').html(content);
        this.attachGridListeners();
    }

    attachGridListeners() {
        $('#passwordList tbody .showPasswrdBtn').off('click').on('click', (e) => {
            this.onShowPasswordBtnClicked(e);
        });
        $('#passwordList tbody .hidePasswrdBtn').off('click').on('click', (e) => {
            this.onHidePasswordBtnClicked(e);
        });
        $('#passwordList tbody .deletePasswrdBtn').off('click').on('click', (e) => {
            this.onDeletePasswordBtnClicked(e);
        });

        $('#passwordList tbody .editPasswrdBtn').off('click').on('click', (e) => {
            this.onEditPasswordBtnClicked(e);
        });
    }

    onShowPasswordBtnClicked(e) {
        let id = $(e.currentTarget).attr('data-id');
        if(id) {
            let row = this.data.find(_data => _data.id === id);
            if(row) {
                if(this.secretKey) {
                    this.decryptDataAndShow(row);
                    $(`#passwordList tr#${row.id} .btn-default`).toggleClass('hide');
                    $(e.currentTarget).toggleClass('hide');
                }else {
                    let secretKey = prompt('Enter the secret key for cipher');
                    if(secretKey) {
                        this.secretKey = CryptoJS.AES.encrypt(secretKey, this.config.superkey);
                        sessionStorage.setItem('secret-key', this.secretKey);
                        this.decryptDataAndShow(row);
                        $(`#passwordList tr#${row.id} .btn-default`).toggleClass('hide');
                        $(e.currentTarget).toggleClass('hide');
                    }else {
                        alert('No secret key or incorrect secret key entered.Could not proceed.');
                    }
                }
            }
        }
    }

    decryptDataAndShow(row) {
        // let _bytes  = CryptoJS.AES.decrypt(this.secretKey, this.config.superkey);
        // let key = _bytes.toString(CryptoJS.enc.Utf8);
        let bytes  = CryptoJS.AES.decrypt(row.password, this.getkeyToDecrypt(this.secretKey));
        let plaintext = bytes.toString(CryptoJS.enc.Utf8);
        $(`#passwordList tr#${row.id} td:nth-child(2)`).text(plaintext);
    }

    

    onHidePasswordBtnClicked(e) {
        let id = $(e.currentTarget).attr('data-id');
        if(id) {
            let row = this.data.find(_data => _data.id === id);
            if(row) {
                $(`#passwordList tr#${row.id} td:nth-child(2)`).text(row.password.split('').fill('*').join(''));
                $(`#passwordList tr#${row.id} .btn-primary`).toggleClass('hide');
                $(e.currentTarget).toggleClass('hide');
            }
        }
    }

    onDeletePasswordBtnClicked(e) {
        let id = $(e.currentTarget).attr('data-id');
        if(id) {
            if(confirm("Are you sure you want to delete this record?")){
                
                // this.db.ref(`passwords/${id}`).remove();
                this.request('DELETE',`/info/${id}`)
                .then(response => {
                    this.loadList();
                });
            }
        }        
    }

    onEditPasswordBtnClicked(e) {
        this.mode = 2;
        $('#passwrdDlg').modal('show');
        let id = $(e.currentTarget).attr('data-id');
        if(id) {
            let row = this.data.find(_data => _data.id === id);
            if(row) {
                this.selectedRecord = row;
                
            }
        }
    }

    generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }
}

$(function(){
    let o = new Passwordbox();
    o.initApp();
});
