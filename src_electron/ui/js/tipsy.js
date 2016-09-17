/* ==========================================================
 * Tipsy-like popups (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013 Dmitry Sorin <info@staypositive.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

document.addEventListener("DOMContentLoaded", function() {
	var listener = function (evt) {
		var originalTitle = evt.target.getAttribute("title"),
			tooltipText = evt.target.dataset.title || originalTitle || "", // chrome15 and older returns an empty string for non-existing dataset property
			gravity = evt.target.dataset.gravity || "",
			tenPercentWidth = window.innerWidth / 10,
			tenPercentHeight = window.innerHeight / 10,
			tipCalcCoords = [],
			tip,
			elemBox,
			elemBoxTop,
			elemBoxLeft,
			pageScrollX,
			pageScrollY,
			tipWidth,
			tipHeight,
			tp;

		// check for element's "title" attribute or dataset property	
		if (tooltipText.length === 0) {
			return true;
		}

		if (evt.type === "mouseover") {
			// convert title attribute to dataset property
			if (originalTitle !== null) {
				evt.target.removeAttribute("title");
				evt.target.dataset.title = tooltipText;
			}

			// create tooltip
			tip = document.createElement("div");
			tip.classList.add("tipsy");
			tip.innerHTML = "<div class='tipsy-arrow'></div><div class='tipsy-inner'></div>";

			tip.lastChild.innerText = tooltipText;
			tip.classList.add("hidden");
			document.body.appendChild(tip);

			// calculate page offsets
			pageScrollX = (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft);
			pageScrollY = (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);

			// calculate element coords
			elemBox = evt.target.getBoundingClientRect();
			elemBoxTop = elemBox.top + pageScrollY;
			elemBoxLeft = elemBox.left + pageScrollX;
			tipWidth = tip.offsetWidth;
			tipHeight = tip.offsetHeight;

			// set tip type if empty
			if (gravity.length === 0) {
				// calculate Y-position
				tipCalcCoords = [pageScrollY + window.innerHeight / 2];
				tipCalcCoords[1] = tipCalcCoords[0] + tenPercentHeight / 2;
				tipCalcCoords[0] -= tenPercentHeight / 2;

				if (elemBoxTop < tipCalcCoords[0]) {
					gravity += "n";
				} else if (elemBoxTop > tipCalcCoords[1]) {
					gravity += "s";
				}

				// calculate X-position
				tipCalcCoords = [pageScrollX + window.innerWidth / 2];
				tipCalcCoords[1] = tipCalcCoords[0] + tenPercentWidth / 2;
				tipCalcCoords[0] -= tenPercentWidth / 2;

				if (elemBoxLeft < tipCalcCoords[0]) {
					gravity += "w";
				} else if (elemBoxLeft > tipCalcCoords[1]) {
					gravity += "e";
				}

				// screen-centered element
				if (gravity.length === 0) {
					gravity = "nw";
				}
			}

			// calculate tip coords
			switch (gravity.charAt(0)) {
			case "n":
				tp = {
					top: elemBoxTop + elemBox.height,
					left: elemBoxLeft + elemBox.width / 2 - tipWidth / 2
				};

				break;

			case "s":
				tp = {
					top: elemBoxTop - tipHeight,
					left: elemBoxLeft + elemBox.width / 2 - tipWidth / 2
				};

				break;

			case "e":
				tp = {
					top: elemBoxTop + elemBox.height / 2 - tipHeight / 2,
					left: elemBoxLeft - tipWidth
				};

				break;

			case "w":
				tp = {
					top: elemBoxTop + elemBox.height / 2 - tipHeight / 2,
					left: elemBoxLeft + elemBox.width
				};

				break;
			}

			if (gravity.length === 2) {
				if (gravity.charAt(1) === "w") {
					tp.left = elemBoxLeft + elemBox.width / 2 - 15;
				} else {
					tp.left = elemBoxLeft + elemBox.width / 2 - tipWidth + 15;
				}
			}

			// set tip coords
			tip.style.left = tp.left + "px";
			tip.style.top = tp.top + "px";
			tip.classList.add("tipsy-" + gravity);

			// set tip arrow style
			tip.firstChild.classList.add("tipsy-arrow-" + gravity.charAt(0));

			// finally show tooltip
			tip.classList.remove("hidden");
		} else {
			// remove tooltip from DOM
			tip = document.querySelector("div.tipsy");
			if (tip === null || tip.parentNode !== document.body) {
				return true;
			}

			document.body.removeChild(tip);
		}
	};

	document.body.addEventListener("mouseover", listener, false);
	document.body.addEventListener("click", listener, false);
	document.body.addEventListener("mouseout", listener, false);
}, false);
