const DEFAULT_SETTINGS = {
    githubToken: "",
    githubOwner: "",
    githubRepo: "",
    codeforcesHandle: "",
    codechefHandle: "",
};

function setStatus(message, color = "#0a8a0a") {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.color = color;
}

function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        document.getElementById("codechefHandle").value = settings.codechefHandle;
        document.getElementById("codeforcesHandle").value = settings.codeforcesHandle;
        document.getElementById("githubOwner").value = settings.githubOwner;
        document.getElementById("githubRepo").value = settings.githubRepo;
        document.getElementById("githubToken").value = settings.githubToken;
    });
}

function saveSettings() {
    const settings = {
        codechefHandle: document.getElementById("codechefHandle").value.trim(),
        codeforcesHandle: document.getElementById("codeforcesHandle").value.trim(),
        githubOwner: document.getElementById("githubOwner").value.trim(),
        githubRepo: document.getElementById("githubRepo").value.trim(),
        githubToken: document.getElementById("githubToken").value.trim(),
    };

    chrome.storage.sync.set(settings, () => {
        setStatus("Settings saved.");
    });
}

document.getElementById("saveButton").addEventListener("click", saveSettings);
loadSettings();
