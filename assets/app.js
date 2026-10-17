/* 우리집 경제공부 — 페이지 로직 */
(function () {
  "use strict";

  var REPO = "hongbbol/familymoneymany";
  var LOG_FORM_URL = "https://github.com/" + REPO + "/issues/new?template=study-log.yml";

  document.getElementById("log-button").href = LOG_FORM_URL;
  document.getElementById("repo-link").href = "https://github.com/" + REPO;

  /* ---------- 탭 ---------- */
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.toggle("active", p.id === "panel-" + tab.dataset.tab);
      });
      window.scrollTo({ top: 0 });
    });
  });

  /* ---------- 오늘의 루틴 ---------- */
  var ROUTINES = {
    0: { title: "📖 주말 — 심화의 날 (선택)", steps: ["투자 책 읽기 또는 푹 쉬기", "한 주 공부 기록 돌아보기"] },
    1: { title: "📈 월요일 — 주식의 날", steps: ["경제 뉴스 브리핑 15분 (헤드라인 → 기사 1개 → 용어 1개)", "주식 커리큘럼 이번 주 주제 공부 (20~30분)", "관심 종목 1개 확인 (5~10분)", "오늘 공부 기록하기 ✏️"] },
    2: { title: "🏢 화요일 — 부동산의 날", steps: ["경제 뉴스 브리핑 15분 (헤드라인 → 기사 1개 → 용어 1개)", "부동산 커리큘럼 이번 주 주제 공부 (20~30분)", "관심 지역 실거래가·매물 확인 (5~10분)", "오늘 공부 기록하기 ✏️"] },
    3: { title: "📈 수요일 — 주식의 날", steps: ["경제 뉴스 브리핑 15분", "월요일 주제 이어가기 또는 체크 질문에 답해보기 (20~30분)", "관심 종목 관찰 (5~10분)", "오늘 공부 기록하기 ✏️"] },
    4: { title: "🏢 목요일 — 부동산의 날", steps: ["경제 뉴스 브리핑 15분", "화요일 주제 이어가기 또는 체크 질문에 답해보기 (20~30분)", "관심 지역 관찰 (5~10분)", "오늘 공부 기록하기 ✏️"] },
    5: { title: "🔄 금요일 — 복습의 날", steps: ["경제 뉴스 브리핑 15분", "이번 주 배운 용어·개념 복습 (15분)", "이번 주 시장 한 줄 정리 (15분)", "오늘 공부 기록하기 ✏️"] },
    6: { title: "📖 주말 — 심화의 날 (선택)", steps: ["투자 책 읽기 또는 푹 쉬기", "한 주 공부 기록 돌아보기"] }
  };

  var now = new Date();
  var dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  document.getElementById("today-date").textContent =
    now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일 (" + dayNames[now.getDay()] + ")";
  var routine = ROUTINES[now.getDay()];
  document.getElementById("today-title").textContent = routine.title;
  var stepsEl = document.getElementById("today-steps");
  routine.steps.forEach(function (s) {
    var li = document.createElement("li");
    li.textContent = s;
    stepsEl.appendChild(li);
  });

  /* ---------- 데이터 로드 ---------- */
  fetchJSON("data/curriculum.json").then(function (cur) {
    renderCurriculum("stock", cur.stock);
    renderCurriculum("realestate", cur.realestate);
    updateProgress();
  });

  fetchJSON("data/logs.json").then(function (logs) {
    renderStats(Array.isArray(logs) ? logs : []);
    renderTimeline(Array.isArray(logs) ? logs : []);
  });

  function fetchJSON(path) {
    return fetch(path + "?v=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); })
      .catch(function (e) { console.error(e); return path.indexOf("logs") >= 0 ? [] : { stock: { stages: [] }, realestate: { stages: [] } }; });
  }

  /* ---------- 통계 ---------- */
  function localDateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function renderStats(logs) {
    var dates = {};
    var termCount = 0;
    logs.forEach(function (l) {
      if (l.date) dates[l.date] = true;
      if (l.terms) {
        termCount += String(l.terms).split(/[,，、]/).filter(function (t) { return t.trim(); }).length;
      }
    });
    var uniqueDates = Object.keys(dates).sort();

    // 연속 기록: 오늘 또는 어제부터 거꾸로 센다
    var streak = 0;
    var cursor = new Date();
    if (!dates[localDateStr(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (dates[localDateStr(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // 이번 주(월~일) 기록 일수
    var monday = new Date();
    var diff = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - diff);
    var mondayStr = localDateStr(monday);
    var weekCount = uniqueDates.filter(function (d) { return d >= mondayStr; }).length;

    setText("stat-total", uniqueDates.length + "일");
    setText("stat-streak", streak + "일");
    setText("stat-week", weekCount + "/7일");
    setText("stat-terms", termCount + "개");
  }

  function setText(id, text) { document.getElementById(id).textContent = text; }

  /* ---------- 기록 타임라인 ---------- */
  function renderTimeline(logs) {
    var box = document.getElementById("log-timeline");
    box.innerHTML = "";
    if (!logs.length) {
      var empty = document.createElement("div");
      empty.className = "card empty-state";
      empty.innerHTML = "아직 기록이 없어요.<br>위의 <strong>“오늘 공부 기록하기”</strong> 버튼으로 첫 기록을 남겨보세요! 🌱";
      box.appendChild(empty);
      return;
    }
    logs.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
      .slice(0, 15)
      .forEach(function (l) {
        var entry = document.createElement("div");
        entry.className = "log-entry";

        var date = document.createElement("div");
        date.className = "log-date";
        date.textContent = l.date || "";

        var body = document.createElement("div");
        body.className = "log-body card";

        var cat = document.createElement("span");
        var catName = (l.category || "공통").split("/")[0].trim();
        cat.className = "log-cat cat-" + catName;
        cat.textContent = l.category || "공통";
        body.appendChild(cat);

        if (l.minutes) {
          var min = document.createElement("span");
          min.className = "log-terms";
          min.textContent = "  ⏱ " + l.minutes;
          body.appendChild(min);
        }

        var topic = document.createElement("div");
        topic.className = "log-topic";
        topic.textContent = l.topic || "(제목 없음)";
        body.appendChild(topic);

        if (l.learned) {
          var text = document.createElement("div");
          text.className = "log-text";
          text.textContent = l.learned;
          body.appendChild(text);
        }
        if (l.terms) {
          var terms = document.createElement("div");
          terms.className = "log-terms";
          terms.textContent = "🔤 새 용어: " + l.terms;
          body.appendChild(terms);
        }
        if (l.memo) {
          var memo = document.createElement("div");
          memo.className = "log-terms";
          memo.textContent = "💬 " + l.memo;
          body.appendChild(memo);
        }

        entry.appendChild(date);
        entry.appendChild(body);
        box.appendChild(entry);
      });
  }

  /* ---------- 커리큘럼 ---------- */
  function checkedWeeks(track) {
    try {
      return JSON.parse(localStorage.getItem("done-" + track) || "[]");
    } catch (e) { return []; }
  }
  function saveWeek(track, week, done) {
    try {
      var list = checkedWeeks(track).filter(function (w) { return w !== week; });
      if (done) list.push(week);
      localStorage.setItem("done-" + track, JSON.stringify(list));
    } catch (e) { /* 저장 불가 환경이면 무시 */ }
  }

  function renderCurriculum(track, data) {
    var root = document.getElementById("curriculum-" + track);
    if (!root || !data) return;
    root.innerHTML = "";
    var done = checkedWeeks(track);

    data.stages.forEach(function (stage) {
      var h = document.createElement("h3");
      h.className = "stage-title";
      h.textContent = stage.name;
      root.appendChild(h);

      stage.weeks.forEach(function (w) {
        var card = document.createElement("div");
        card.className = "card week-card" + (done.indexOf(w.week) >= 0 ? " week-done" : "");

        var head = document.createElement("button");
        head.type = "button";
        head.className = "week-head";
        head.setAttribute("aria-expanded", "false");

        var num = document.createElement("span");
        num.className = "week-num";
        num.textContent = w.week + "주차";

        var title = document.createElement("span");
        title.className = "week-title";
        title.textContent = w.title;

        var check = document.createElement("input");
        check.type = "checkbox";
        check.className = "week-check";
        check.checked = done.indexOf(w.week) >= 0;
        check.setAttribute("aria-label", w.week + "주차 완료 표시");
        check.addEventListener("click", function (e) { e.stopPropagation(); });
        check.addEventListener("change", function () {
          saveWeek(track, w.week, check.checked);
          card.classList.toggle("week-done", check.checked);
          updateProgress();
        });

        var arrow = document.createElement("span");
        arrow.className = "week-arrow";
        arrow.textContent = "▸";

        head.appendChild(num);
        head.appendChild(title);
        head.appendChild(check);
        head.appendChild(arrow);
        head.addEventListener("click", function () {
          var open = card.classList.toggle("open");
          head.setAttribute("aria-expanded", open ? "true" : "false");
        });

        var bodyEl = document.createElement("div");
        bodyEl.className = "week-body";

        var h5a = document.createElement("h5");
        h5a.textContent = "이번 주에 공부할 것";
        bodyEl.appendChild(h5a);
        var ulA = document.createElement("ul");
        w.topics.forEach(function (t) {
          var li = document.createElement("li");
          li.textContent = t;
          ulA.appendChild(li);
        });
        bodyEl.appendChild(ulA);

        var h5b = document.createElement("h5");
        h5b.textContent = "✅ 체크 질문 — 답할 수 있으면 통과!";
        bodyEl.appendChild(h5b);
        var ulB = document.createElement("ul");
        w.questions.forEach(function (q) {
          var li = document.createElement("li");
          li.textContent = q;
          ulB.appendChild(li);
        });
        bodyEl.appendChild(ulB);

        card.appendChild(head);
        card.appendChild(bodyEl);
        root.appendChild(card);
      });
    });
  }

  function updateProgress() {
    ["stock", "realestate"].forEach(function (track) {
      var doneCount = checkedWeeks(track).length;
      var pct = Math.min(100, Math.round((doneCount / 12) * 100));
      var fill = document.getElementById("progress-" + track);
      var label = document.getElementById("progress-" + track + "-label");
      if (fill) fill.style.width = pct + "%";
      if (label) label.textContent = doneCount + "/12주";
    });
  }
})();
