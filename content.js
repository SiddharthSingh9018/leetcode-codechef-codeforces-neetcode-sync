const DEFAULT_SETTINGS = {
    githubToken: "",
    githubOwner: "",
    githubRepo: "",
    codeforcesHandle: "",
    codechefHandle: "",
};

const FILE_EXTENSIONS = {
    "GNU C11": ".c",
    "GNU C++14": ".cpp",
    "GNU C++17": ".cpp",
    "GNU C++17 (64)": ".cpp",
    "GNU C++20 (64)": ".cpp",
    "GNU C++23 (64)": ".cpp",
    "GNU C++23 (64, msys2)": ".cpp",
    "C++20 (GCC 13-64)": ".cpp",
    "C++23 (GCC 14-64, msys2)": ".cpp",
    "MS C++ 2017": ".cpp",
    "MS C++ 2022": ".cpp",
    "PyPy 2": ".py",
    "PyPy 3": ".py",
    "PyPy 3-64": ".py",
    "Python 2": ".py",
    "Python 3": ".py",
    "Python 3.8.10": ".py",
    "Python 3.10": ".py",
    "Java 8": ".java",
    "Java 11": ".java",
    "Java 17": ".java",
    "Kotlin 1.6": ".kt",
    "Kotlin 1.7": ".kt",
    "Kotlin 1.9": ".kt",
    "Rust 2021": ".rs",
    "Go": ".go",
    "JavaScript": ".js",
    "Node.js": ".js",
    "C# 8": ".cs",
    "C# 10": ".cs",
    PHP: ".php",
    Ruby: ".rb",
    Python3: ".py",
    "C++20": ".cpp",
    C: ".c",
    Java: ".java",
    "C#": ".cs",
    Swift: ".swift",
    Kotlin: ".kt",
    Scala: ".scala",
    Rust: ".rs",
    TypeScript: ".ts",
    R: ".r",
    SQL: ".sql",
    "MS SQL Server": ".sql",
    OracleDB: ".sql",
};

function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => resolve(settings));
    });
}

function updateStatus(message, color = "#333") {
    const status = document.getElementById("codesync-status");
    if (status) {
        status.textContent = message;
        status.style.color = color;
    }
}

function ensureStatusUi({ parent, buttonText, linkText }) {
    if (document.getElementById("codesync-container")) {
        return document.getElementById("codesync-container");
    }

    const container = document.createElement("div");
    container.id = "codesync-container";
    container.style.margin = "12px 0";
    container.style.padding = "12px";
    container.style.border = "1px solid #c8d6e5";
    container.style.background = "#f8fbff";
    container.style.borderRadius = "6px";
    container.style.fontFamily = "Arial, sans-serif";

    const title = document.createElement("div");
    title.textContent = "Contest Sync";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "8px";

    const button = document.createElement("button");
    button.id = "codesync-sync-button";
    button.textContent = buttonText;
    button.style.padding = "8px 12px";
    button.style.cursor = "pointer";
    button.style.border = "1px solid #2d6cdf";
    button.style.background = "#2d6cdf";
    button.style.color = "#fff";
    button.style.borderRadius = "4px";

    const status = document.createElement("div");
    status.id = "codesync-status";
    status.style.marginTop = "8px";
    status.style.fontSize = "13px";
    status.style.color = "#333";

    const link = document.createElement("a");
    link.href = chrome.runtime.getURL("options.html");
    link.target = "_blank";
    link.textContent = linkText;
    link.style.display = "inline-block";
    link.style.marginTop = "8px";
    link.style.fontSize = "12px";

    container.appendChild(title);
    container.appendChild(button);
    container.appendChild(status);
    container.appendChild(link);
    parent.prepend(container);
    return container;
}

function setButtonState(disabled) {
    const button = document.getElementById("codesync-sync-button");
    if (button) {
        button.disabled = disabled;
        button.style.opacity = disabled ? "0.7" : "1";
        button.style.cursor = disabled ? "not-allowed" : "pointer";
    }
}

function sanitizeFileName(text) {
    return text
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

function decodeHtml(html) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
}

function toBase64Unicode(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function requireSettings(settings, keys, platformName) {
    const missing = keys.filter((key) => !settings[key]);
    if (missing.length === 0) {
        return;
    }

    const labels = {
        githubToken: "GitHub token",
        githubOwner: "GitHub owner",
        githubRepo: "GitHub repository",
        codeforcesHandle: "Codeforces handle",
        codechefHandle: "CodeChef handle",
    };

    const missingLabels = missing.map((key) => labels[key] || key).join(", ");
    throw new Error(`Open Contest Sync settings and fill in: ${missingLabels}${platformName ? ` for ${platformName}` : ""}.`);
}

async function githubRequest(url, settings) {
    return fetch(url, {
        headers: {
            Authorization: `token ${settings.githubToken}`,
            Accept: "application/vnd.github+json",
        },
    });
}

async function upsertGitHubFile(settings, filePath, content, message) {
    const apiUrl = `https://api.github.com/repos/${settings.githubOwner}/${settings.githubRepo}/contents/${filePath}`;
    const existingResponse = await githubRequest(apiUrl, settings);

    const body = {
        message,
        content: toBase64Unicode(content),
    };

    if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        body.sha = existingData.sha;
    }

    const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
            Authorization: `token ${settings.githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
            throw new Error("GitHub rejected the token. Open Contest Sync settings and update your GitHub token.");
        }
        if (response.status === 404) {
            throw new Error(`GitHub repo not found: ${settings.githubOwner}/${settings.githubRepo}.`);
        }
        throw new Error(`GitHub upload failed: ${response.status} ${errorText}`);
    }
}

async function uploadSolutionBundle(settings, payload) {
    const codeMessage = `${payload.platform}: add ${payload.title} solution (${payload.commitSuffix})`;
    const readmeMessage = `${payload.platform}: add README for ${payload.title} (${payload.commitSuffix})`;

    updateStatus("Uploading README to GitHub...", "#2d6cdf");
    await upsertGitHubFile(settings, payload.readmePath, payload.readmeContent, readmeMessage);

    updateStatus("Uploading source code to GitHub...", "#2d6cdf");
    await upsertGitHubFile(settings, payload.codePath, payload.codeContent, codeMessage);
}

function isCodeforcesProblemPage() {
    return window.location.hostname.includes("codeforces.com") &&
        /^\/(problemset\/problem|contest\/\d+\/problem|gym\/\d+\/problem)\//.test(window.location.pathname);
}

function getCodeforcesContext() {
    const match = window.location.pathname.match(/^\/(?:(problemset)\/problem\/(\d+)\/([A-Za-z0-9]+)|(contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+))/);
    if (!match) {
        return null;
    }

    if (match[1] === "problemset") {
        return {
            contestId: match[2],
            problemIndex: match[3],
            submissionBase: "/contest",
        };
    }

    return {
        contestId: match[5],
        problemIndex: match[6],
        submissionBase: `/${match[4]}`,
    };
}

function getCodeforcesProblemTitle() {
    const titleNode = document.querySelector(".problem-statement .title");
    return titleNode ? titleNode.textContent.trim() : window.location.pathname;
}

function getCodeforcesMetadataValue(label) {
    const captions = Array.from(document.querySelectorAll(".problem-statement .header .property-title"));
    const target = captions.find((node) => node.textContent.trim().toLowerCase() === label.toLowerCase());
    if (!target) {
        return "";
    }

    const parent = target.parentElement;
    return parent ? parent.textContent.replace(target.textContent, "").trim() : "";
}

function getCodeforcesRating() {
    const ratingNode = Array.from(document.querySelectorAll(".tag-box"))
        .find((node) => /^\*\d+$/.test(node.textContent.trim()));
    return ratingNode ? ratingNode.textContent.trim() : "";
}

function getCodeforcesTags() {
    return Array.from(document.querySelectorAll(".tag-box"))
        .map((node) => node.textContent.trim())
        .filter((tag) => tag && !/^\*\d+$/.test(tag));
}

function getCodeforcesStatementHtml() {
    const statement = document.querySelector(".problem-statement");
    return statement ? statement.innerHTML : "";
}

async function fetchCodeforcesAcceptedSubmission(problemContext, handle) {
    const apiUrl = new URL("https://codeforces.com/api/contest.status");
    apiUrl.searchParams.set("contestId", problemContext.contestId);
    apiUrl.searchParams.set("handle", handle);
    apiUrl.searchParams.set("from", "1");
    apiUrl.searchParams.set("count", "100");

    const response = await fetch(apiUrl.toString(), { credentials: "include" });
    const payload = await response.json();

    if (payload.status !== "OK") {
        throw new Error(payload.comment || "Codeforces API request failed.");
    }

    const accepted = payload.result.find((submission) =>
        submission.verdict === "OK" &&
        String(submission.problem?.contestId) === String(problemContext.contestId) &&
        String(submission.problem?.index) === String(problemContext.problemIndex)
    );

    if (!accepted) {
        throw new Error("No accepted submission found for this problem and handle.");
    }

    return accepted;
}

async function fetchCodeforcesSource(problemContext, submissionId) {
    const submissionUrl = `${window.location.origin}${problemContext.submissionBase}/${problemContext.contestId}/submission/${submissionId}`;
    const response = await fetch(submissionUrl, { credentials: "include" });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const codeNode = doc.querySelector("#program-source-text");

    if (!codeNode) {
        throw new Error("Could not read submission source. Make sure you are logged in to Codeforces.");
    }

    return decodeHtml(codeNode.innerHTML);
}

function makeCodeforcesReadme(title, statementHtml) {
    const metadata = {
        timeLimit: getCodeforcesMetadataValue("time limit per test"),
        memoryLimit: getCodeforcesMetadataValue("memory limit per test"),
        rating: getCodeforcesRating(),
        tags: getCodeforcesTags(),
    };

    const parts = [`<h2><a href="${window.location.href}">${title}</a></h2>`];
    if (metadata.timeLimit) {
        parts.push(`<p><strong>Time limit:</strong> ${metadata.timeLimit}</p>`);
    }
    if (metadata.memoryLimit) {
        parts.push(`<p><strong>Memory limit:</strong> ${metadata.memoryLimit}</p>`);
    }
    if (metadata.rating) {
        parts.push(`<p><strong>Rating:</strong> ${metadata.rating}</p>`);
    }
    if (metadata.tags.length > 0) {
        parts.push(`<p><strong>Tags:</strong> ${metadata.tags.join(", ")}</p>`);
    }
    parts.push(statementHtml);
    return parts.join("");
}

async function syncCodeforces() {
    const settings = await getSettings();
    requireSettings(settings, ["githubToken", "githubOwner", "githubRepo", "codeforcesHandle"], "Codeforces");

    const problemContext = getCodeforcesContext();
    if (!problemContext) {
        throw new Error("Open a Codeforces problem page before syncing.");
    }

    const title = getCodeforcesProblemTitle();
    updateStatus("Finding latest accepted submission...", "#2d6cdf");
    const submission = await fetchCodeforcesAcceptedSubmission(problemContext, settings.codeforcesHandle);

    updateStatus("Fetching submission source...", "#2d6cdf");
    const sourceCode = await fetchCodeforcesSource(problemContext, submission.id);
    const safeTitle = sanitizeFileName(title.replace(/^[A-Za-z0-9]+\.\s*/, ""));
    const folderName = `codeforces/${problemContext.contestId}${problemContext.problemIndex}-${safeTitle}`;

    await uploadSolutionBundle(settings, {
        platform: "Codeforces",
        title,
        commitSuffix: `submission ${submission.id}`,
        codePath: `${folderName}/${safeTitle}${FILE_EXTENSIONS[submission.programmingLanguage] || ".txt"}`,
        codeContent: sourceCode,
        readmePath: `${folderName}/README.md`,
        readmeContent: makeCodeforcesReadme(title, getCodeforcesStatementHtml()),
    });
}

function isCodeChefProblemPage() {
    return window.location.hostname === "www.codechef.com" &&
        (window.location.pathname.includes("/problems/") || window.location.pathname.includes("/practice/"));
}

function isCodeChefViewSolutionPage() {
    return window.location.hostname === "www.codechef.com" &&
        /^\/viewsolution\/\d+/.test(window.location.pathname);
}

function getCodeChefProblemTitle() {
    const problemStatement = document.getElementById("problem-statement");
    if (!problemStatement || !problemStatement.children[0]) {
        return window.location.pathname;
    }
    return problemStatement.children[0].innerText.trim();
}

function getCodeChefProblemCode() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1].split("?")[0];
}

function getCodeChefSubmissionIdFromPage() {
    return window.location.pathname.match(/\/viewsolution\/(\d+)/)?.[1] || "";
}

function getCodeChefDifficulty() {
    const difficultyElement = document.querySelector("span._value_lvmtf_32._dark_lvmtf_29");
    return difficultyElement ? difficultyElement.innerText.trim() : "";
}

function getCodeChefStatementHtml() {
    const problemStatementElement = document.getElementById("problem-statement");
    if (!problemStatementElement) {
        return "";
    }

    const parts = [];
    Array.from(problemStatementElement.children).forEach((child, index) => {
        if (index === 0) {
            return;
        }

        if (child.classList.contains("_input_output__table_1x1re_194")) {
            const preTags = child.querySelectorAll("pre");
            if (preTags.length >= 2) {
                parts.push("<h4>Input:</h4>");
                parts.push(preTags[0].outerHTML);
                parts.push("<h4>Output:</h4>");
                parts.push(preTags[1].outerHTML);
                return;
            }
        }

        parts.push(child.outerHTML);
    });

    return parts.join("");
}

async function fetchCodeChefSubmissionCode(submissionId) {
    if (isCodeChefViewSolutionPage() && getCodeChefSubmissionIdFromPage() === String(submissionId)) {
        const visibleCode = getCodeChefVisibleSourceFromCurrentPage();
        if (visibleCode) {
            return visibleCode;
        }
    }

    const urls = [
        `https://www.codechef.com/viewsolution/${submissionId}`,
        `https://www.codechef.com/viewplaintext/${submissionId}`,
        `https://www.codechef.com/status/${getCodeChefProblemCode()},${submissionId}`,
    ];

    for (const url of urls) {
        const response = await fetch(url, { credentials: "include" });
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const candidateSelectors = [
            "pre",
            "code",
            "textarea",
            "#solution-toggle + pre",
            "#solution-toggle pre",
            "[class*='solution'] pre",
            "[id*='solution'] pre",
            ".ace_content",
            ".ace_text-layer",
            ".CodeMirror-code",
            "[class*='editor'] pre",
            "[class*='editor'] code",
            "[data-testid*='solution']",
        ];

        for (const selector of candidateSelectors) {
            const node = doc.querySelector(selector);
            const content = decodeHtml(node?.textContent || node?.innerHTML || "");
            if (content && content.trim().length > 20) {
                return content;
            }
        }

        const scripts = Array.from(doc.querySelectorAll("script"))
            .map((node) => node.textContent || "")
            .join("\n");
        const scriptPatterns = [
            /"submissionCode"\s*:\s*"([\s\S]*?)"/,
            /"solution"\s*:\s*"([\s\S]*?)"/,
            /"sourceCode"\s*:\s*"([\s\S]*?)"/,
            /submissionCode\s*=\s*"([\s\S]*?)"/,
        ];

        for (const pattern of scriptPatterns) {
            const match = scripts.match(pattern);
            if (match?.[1]) {
                const normalized = match[1]
                    .replace(/\\n/g, "\n")
                    .replace(/\\t/g, "\t")
                    .replace(/\\"/g, "\"")
                    .replace(/\\\\/g, "\\");
                if (normalized.trim().length > 20) {
                    return normalized;
                }
            }
        }
    }

    throw new Error("Could not read CodeChef submission source. Make sure you are logged in and can open the submission source in CodeChef.");
}

function getCodeChefVisibleSourceFromCurrentPage() {
    const candidateSelectors = [
        "pre",
        "code",
        "textarea",
        ".ace_content",
        ".ace_text-layer",
        ".CodeMirror-code",
        "[class*='solution'] pre",
        "[id*='solution'] pre",
        "[class*='editor'] pre",
        "[class*='editor'] code",
        "[data-testid*='solution']",
    ];

    for (const selector of candidateSelectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        for (const node of nodes) {
            const content = decodeHtml(node.textContent || node.innerHTML || "");
            if (content && content.trim().length > 20) {
                return content;
            }
        }
    }

    const pageText = document.body ? document.body.innerText : "";
    const lines = pageText.split("\n").map((line) => line.trim()).filter(Boolean);
    const likelyCode = lines.filter((line) =>
        /[;{}()=#<>]/.test(line) || /\b(for|while|if|return|class|def|public|private|int|string|vector)\b/.test(line)
    );

    if (likelyCode.length >= 3) {
        return likelyCode.join("\n");
    }

    return "";
}

function getCodeChefViewSolutionTitle() {
    const heading = document.querySelector("h1, h2, h3");
    if (heading?.textContent?.trim()) {
        return heading.textContent.trim();
    }

    const problemLink = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
        /\/problems\//.test(anchor.getAttribute("href") || "")
    );
    if (problemLink?.textContent?.trim()) {
        return problemLink.textContent.trim();
    }

    const submissionId = getCodeChefSubmissionIdFromPage();
    return `CodeChef Submission ${submissionId}`;
}

function getCodeChefViewSolutionProblemCode() {
    const problemLink = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
        /\/problems\/([^/?#]+)/.test(anchor.getAttribute("href") || "")
    );

    const href = problemLink?.getAttribute("href") || "";
    return href.match(/\/problems\/([^/?#]+)/)?.[1] || `submission-${getCodeChefSubmissionIdFromPage()}`;
}

async function syncCurrentCodeChefViewSolution() {
    const settings = await getSettings();
    requireSettings(settings, ["githubToken", "githubOwner", "githubRepo"], "CodeChef");

    const submissionId = getCodeChefSubmissionIdFromPage();
    if (!submissionId) {
        throw new Error("Open a CodeChef viewsolution page before syncing.");
    }

    const sourceCode = getCodeChefVisibleSourceFromCurrentPage();
    if (!sourceCode) {
        throw new Error("Could not read code from this viewsolution page.");
    }

    const title = getCodeChefViewSolutionTitle();
    const problemCode = getCodeChefViewSolutionProblemCode();
    const safeTitle = sanitizeFileName(title);
    const folderName = `codechef/${problemCode}-${safeTitle}`;
    const extension = ".txt";

    await uploadSolutionBundle(settings, {
        platform: "CodeChef",
        title,
        commitSuffix: `submission ${submissionId}`,
        codePath: `${folderName}/${safeTitle}${extension}`,
        codeContent: sourceCode,
        readmePath: `${folderName}/README.md`,
        readmeContent: `<h2><a href="${window.location.href}">${title}</a></h2><p><strong>Submission ID:</strong> ${submissionId}</p>`,
    });
}

function readCodeChefSubmissionDetails() {
    const cleanText = (value) => (value || "").replace(/\s+/g, " ").trim();

    const parseGenericSubmissionRow = () => {
        const pageText = cleanText(document.body ? document.body.innerText : "");
        const pageLanguage = Object.keys(FILE_EXTENSIONS).find((language) => pageText.includes(language)) || "";
        const pageTimeMatch = pageText.match(/(\d+(?:\.\d+)?)\s*(?:sec|s|ms)/i);
        const pageMemoryMatch = pageText.match(/(\d+(?:\.\d+)?)\s*(?:kb|mb)/i);
        const pageSubmissionLink = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
            /viewsolution\/\d+|viewplaintext\/\d+|\/status\/.*\d{5,}/i.test(anchor.getAttribute("href") || "")
        );
        const pageSubmissionId =
            pageSubmissionLink?.getAttribute("href")?.match(/(\d{5,})/)?.[1] ||
            window.location.href.match(/(\d{5,})/)?.[1] ||
            "";

        if (pageSubmissionId) {
            return {
                submissionId: pageSubmissionId,
                executionTime: pageTimeMatch?.[0] || "",
                memoryUsage: pageMemoryMatch?.[0] || "",
                programmingLanguage: pageLanguage,
            };
        }

        const rows = Array.from(document.querySelectorAll("tr, [role='row'], div"));

        for (const row of rows) {
            const text = cleanText(row.innerText);
            if (!text) {
                continue;
            }

            const maybeAccepted = /correct|accepted|you got it right/i.test(text);
            const maybeSubmissionLink = row.querySelector("a[href*='/status/'], a[href*='/viewsolution/'], a[href*='/submit/']");
            if (!maybeAccepted && !maybeSubmissionLink) {
                continue;
            }

            const submissionIdFromHref = maybeSubmissionLink?.getAttribute("href")?.match(/(\d{5,})/);
            const submissionIdFromText = text.match(/\b\d{5,}\b/);
            const programmingLanguage =
                Object.keys(FILE_EXTENSIONS).find((language) => text.includes(language)) || "";
            const timeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|s|ms)/i);
            const memoryMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kb|mb)/i);

            if (!submissionIdFromHref && !submissionIdFromText) {
                continue;
            }

            return {
                submissionId: submissionIdFromHref?.[1] || submissionIdFromText?.[0] || "",
                executionTime: timeMatch?.[0] || "",
                memoryUsage: memoryMatch?.[0] || "",
                programmingLanguage,
            };
        }

        return null;
    };

    const directPageResult = parseGenericSubmissionRow();
    if (directPageResult && directPageResult.submissionId) {
        return directPageResult;
    }

    let submissionRow;
    if (window.innerWidth < 975) {
        const rows = document.querySelectorAll("._my-submissions_1jl4n_157");
        submissionRow = rows[1];
        if (!submissionRow) {
            return parseGenericSubmissionRow();
        }

        const dataContainers = submissionRow.querySelectorAll("._data__container_1jl4n_188");
        if (!dataContainers.length || dataContainers[0].children.length <= 3) {
            return parseGenericSubmissionRow();
        }

        return {
            submissionId: dataContainers[0].children[0].querySelector("a")?.innerHTML,
            executionTime: dataContainers[0].children[2]?.children[0]?.children[1]?.innerHTML,
            memoryUsage: dataContainers[0].children[2]?.children[1]?.children[1]?.innerHTML,
            programmingLanguage: dataContainers[0].children[3]?.children[0]?.children[1]?.innerHTML,
        };
    }

    const rows = document.querySelectorAll("#MUIDataTableBodyRow-0");
    submissionRow = rows[1];
    if (!submissionRow || submissionRow.children.length <= 4) {
        return parseGenericSubmissionRow();
    }

    return {
        submissionId: submissionRow.children[0]?.children[1]?.innerHTML,
        executionTime: submissionRow.children[2]?.children[1]?.innerHTML,
        memoryUsage: submissionRow.children[3]?.children[1]?.innerHTML,
        programmingLanguage: submissionRow.children[4]?.children[1]?.innerHTML,
    };
}

function makeCodeChefReadme(title, difficulty, statementHtml) {
    const difficultyHtml = difficulty ? `<h4>Difficulty: ${difficulty}</h4>` : "";
    return `<h2><a href="${window.location.href}">${title}</a></h2>${difficultyHtml}${statementHtml}`;
}

function hasCodeChefAcceptedState() {
    const successSelectors = [
        "._status-success_vov4h_275",
        "[class*='status-success']",
        "[class*='success']",
    ];

    if (successSelectors.some((selector) => document.querySelector(selector))) {
        return true;
    }

    const pageText = document.body ? document.body.innerText : "";
    return pageText.includes("You got it right!") || pageText.includes("Result - Correct");
}

async function syncCodeChefSubmission(details) {
    const settings = await getSettings();
    requireSettings(settings, ["githubToken", "githubOwner", "githubRepo"], "CodeChef");

    const title = getCodeChefProblemTitle();
    const problemCode = getCodeChefProblemCode();
    const safeTitle = sanitizeFileName(title);
    const folderName = `codechef/${problemCode}-${safeTitle}`;
    const extension = FILE_EXTENSIONS[details.programmingLanguage] || ".txt";
    const sourceCode = await fetchCodeChefSubmissionCode(details.submissionId);

    await uploadSolutionBundle(settings, {
        platform: "CodeChef",
        title,
        commitSuffix: `submission ${details.submissionId}`,
        codePath: `${folderName}/${safeTitle}${extension}`,
        codeContent: sourceCode,
        readmePath: `${folderName}/README.md`,
        readmeContent: makeCodeChefReadme(title, getCodeChefDifficulty(), getCodeChefStatementHtml()),
    });
}

function attemptCodeChefSync() {
    updateStatus("Accepted submission detected. Reading details...", "#2d6cdf");
    let attempts = 0;
    const maxAttempts = 50;
    const poll = window.setInterval(async () => {
        try {
            attempts += 1;
            const details = readCodeChefSubmissionDetails();
            if (!details || !details.submissionId) {
                if (attempts === 5) {
                    const submissionsTab = document.getElementById("vertical-tab-panel-1");
                    if (submissionsTab) {
                        submissionsTab.click();
                    }
                }
                if (attempts === 10) {
                    updateStatus("Still reading submission details from CodeChef...", "#2d6cdf");
                }
                if (attempts >= maxAttempts) {
                    window.clearInterval(poll);
                    updateStatus("Could not find a CodeChef submission ID on this page. Open the My Submissions tab, wait for the accepted row, then click sync again.", "#c0392b");
                }
                return;
            }

            window.clearInterval(poll);
            updateStatus(`Found submission ${details.submissionId}. Fetching source code...`, "#2d6cdf");
            await syncCodeChefSubmission(details);
            updateStatus("Accepted CodeChef submission synced to GitHub.", "#0a8a0a");
        } catch (error) {
            window.clearInterval(poll);
            console.error(error);
            updateStatus(error.message || "Sync failed.", "#c0392b");
        }
    }, 200);
}

function initCodeforces() {
    const parent =
        document.querySelector(".roundbox.sidebox") ||
        document.querySelector(".second-level-menu-list") ||
        document.querySelector(".problem-statement") ||
        document.body;

    ensureStatusUi({
        parent,
        buttonText: "Sync latest accepted",
        linkText: "Configure GitHub / handles",
    });
    updateStatus("Ready to sync this Codeforces problem.");

    const button = document.getElementById("codesync-sync-button");
    if (!button || button.dataset.bound === "true") {
        return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", async () => {
        setButtonState(true);
        try {
            await syncCodeforces();
            updateStatus("Synced latest accepted submission to GitHub.", "#0a8a0a");
        } catch (error) {
            console.error(error);
            updateStatus(error.message || "Sync failed.", "#c0392b");
        } finally {
            setButtonState(false);
        }
    });
}

function initCodeChef() {
    const parent = document.querySelector("._leftContainer_hhp7w_79") || document.body;

    ensureStatusUi({
        parent,
        buttonText: "Sync latest accepted now",
        linkText: "Configure GitHub / handles",
    });

    const button = document.getElementById("codesync-sync-button");
    if (button) {
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }

    updateStatus("CodeChef mode active. Submit an accepted solution to sync automatically, or click the button after acceptance.", "#0a8a0a");

    if (button && button.dataset.bound !== "true") {
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            setButtonState(true);
            attemptCodeChefSync();
            window.setTimeout(() => setButtonState(false), 3000);
        });
    }

    const submitBtn = document.getElementById("submit_btn");
    if (!submitBtn || submitBtn.dataset.codesyncBound === "true") {
        return;
    }

    submitBtn.dataset.codesyncBound = "true";
    submitBtn.addEventListener("click", () => {
        let observerRun = false;
        const observer = new MutationObserver(() => {
            if (observerRun) {
                return;
            }

            if (!hasCodeChefAcceptedState()) {
                return;
            }

            observerRun = true;
            observer.disconnect();
            attemptCodeChefSync();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}

function initCodeChefViewSolution() {
    const parent = document.body;

    ensureStatusUi({
        parent,
        buttonText: "Sync this viewsolution page",
        linkText: "Configure GitHub / handles",
    });
    updateStatus("CodeChef viewsolution page detected. Sync directly from this page.", "#0a8a0a");

    const button = document.getElementById("codesync-sync-button");
    if (!button || button.dataset.bound === "true") {
        return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", async () => {
        setButtonState(true);
        try {
            updateStatus("Reading source from current viewsolution page...", "#2d6cdf");
            await syncCurrentCodeChefViewSolution();
            updateStatus("CodeChef submission synced to GitHub.", "#0a8a0a");
        } catch (error) {
            console.error(error);
            updateStatus(error.message || "Sync failed.", "#c0392b");
        } finally {
            setButtonState(false);
        }
    });
}

function waitForCodeChefSubmitButton() {
    const interval = window.setInterval(() => {
        if (!isCodeChefProblemPage()) {
            window.clearInterval(interval);
            return;
        }

        if (document.getElementById("submit_btn")) {
            window.clearInterval(interval);
            initCodeChef();
        }
    }, 250);
}

function init() {
    if (isCodeforcesProblemPage()) {
        initCodeforces();
        return;
    }

    if (isCodeChefViewSolutionPage()) {
        initCodeChefViewSolution();
        return;
    }

    if (isCodeChefProblemPage()) {
        waitForCodeChefSubmitButton();
    }
}

init();
