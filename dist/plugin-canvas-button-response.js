var jsPsychCanvasButtonResponse = (function (jspsych) {
  'use strict';

  var version = "2.0.0";

  const info = {
    name: "canvas-button-response",
    version,
    parameters: {
      /**
       * The function to draw on the canvas. This function automatically takes a canvas element as its only argument,
       * e.g. `function(c) {...}`  or `function drawStim(c) {...}`, where `c` refers to the canvas element. Note that
       * the stimulus function will still generally need to set the correct context itself, using a line like
       * `let ctx = c.getContext("2d")`.
       */
      stimulus: {
        type: jspsych.ParameterType.FUNCTION,
        default: void 0
      },
      /** Labels for the buttons. Each different string in the array will generate a different button. */
      choices: {
        type: jspsych.ParameterType.STRING,
        default: void 0,
        array: true
      },
      /**
       * ``(choice: string, choice_index: number)=>`<button class="jspsych-btn">${choice}</button>``; | A
       * function that generates the HTML for each button in the `choices` array. The function gets the
       * string and index of the item in the `choices` array and should return valid HTML. If you want
       * to use different markup for each button, you can do that by using a conditional on either parameter.
       * The default parameter returns a button element with the text label of the choice.
       */
      button_html: {
        type: jspsych.ParameterType.FUNCTION,
        default: function(choice, choice_index) {
          return `<button class="jspsych-btn">${choice}</button>`;
        }
      },
      /** This string can contain HTML markup. Any content here will be displayed below the stimulus.
       * The intention is that it can be used to provide a reminder about the action the participant is supposed
       * to take (e.g., what question to answer).
       */
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null
      },
      /** How long to display the stimulus in milliseconds. The visibility CSS property of the stimulus will be
       * set to `hidden` after this time has elapsed. If this is null, then the stimulus will remain visible until
       * the trial ends.
       */
      stimulus_duration: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      /** How long to wait for the participant to make a response before ending the trial in milliseconds.
       * If the participant fails to make a response before this timer is reached, the participant's response
       * will be recorded as null for the trial and the trial will end. If the value of this parameter is null,
       * the trial will wait for a response indefinitely.
       */
      trial_duration: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      /** Setting to `'grid'` will make the container element have the CSS property `display: grid` and enable
       * the use of `grid_rows` and `grid_columns`. Setting to `'flex'` will make the container element have the
       * CSS property `display: flex`. You can customize how the buttons are laid out by adding inline CSS in
       * the `button_html` parameter.
       */
      button_layout: {
        type: jspsych.ParameterType.STRING,
        default: "grid"
      },
      /**
       * The number of rows in the button grid. Only applicable when `button_layout` is set to `'grid'`.
       * If null, the number of rows will be determined automatically based on the number of buttons and the number of columns.
       */
      grid_rows: {
        type: jspsych.ParameterType.INT,
        default: 1
      },
      /**
       * The number of columns in the button grid. Only applicable when `button_layout` is set to `'grid'`.
       * If null, the number of columns will be determined automatically based on the number of buttons and the number of rows.
       */
      grid_columns: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      /** If true, then the trial will end whenever the participant makes a response (assuming they make their response
       * before the cutoff specified by the `trial_duration` parameter). If false, then the trial will continue until
       * the value for `trial_duration` is reached. You can use this parameter to force the participant to view a
       * stimulus for a fixed amount of time, even if they respond before the time is complete.
       */
      response_ends_trial: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      /** Array that defines the size of the canvas element in pixels. First value is height, second value is width. */
      canvas_size: {
        type: jspsych.ParameterType.INT,
        array: true,
        default: [500, 500]
      }
    },
    data: {
      /** Indicates which button the participant pressed. The first button in the `choices` array is 0, the second is 1, and so on. */
      response: {
        type: jspsych.ParameterType.INT
      },
      /** The response time in milliseconds for the participant to make a response. The time is measured from when the
       * stimulus first appears on the screen until the participant's response.
       */
      rt: {
        type: jspsych.ParameterType.INT
      }
    }
  };
  class CanvasButtonResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    static {
      this.info = info;
    }
    trial(display_element, trial) {
      const stimulusElement = document.createElement("div");
      stimulusElement.id = "jspsych-canvas-button-response-stimulus";
      const canvasElement = document.createElement("canvas");
      canvasElement.id = "jspsych-canvas-stimulus";
      canvasElement.height = trial.canvas_size[0];
      canvasElement.width = trial.canvas_size[1];
      canvasElement.style.display = "block";
      stimulusElement.appendChild(canvasElement);
      display_element.appendChild(stimulusElement);
      const buttonGroupElement = document.createElement("div");
      buttonGroupElement.id = "jspsych-canvas-button-response-btngroup";
      if (trial.button_layout === "grid") {
        buttonGroupElement.classList.add("jspsych-btn-group-grid");
        if (trial.grid_rows === null && trial.grid_columns === null) {
          throw new Error(
            "You cannot set `grid_rows` to `null` without providing a value for `grid_columns`."
          );
        }
        const n_cols = trial.grid_columns === null ? Math.ceil(trial.choices.length / trial.grid_rows) : trial.grid_columns;
        const n_rows = trial.grid_rows === null ? Math.ceil(trial.choices.length / trial.grid_columns) : trial.grid_rows;
        buttonGroupElement.style.gridTemplateColumns = `repeat(${n_cols}, 1fr)`;
        buttonGroupElement.style.gridTemplateRows = `repeat(${n_rows}, 1fr)`;
      } else if (trial.button_layout === "flex") {
        buttonGroupElement.classList.add("jspsych-btn-group-flex");
      }
      for (const [choiceIndex, choice] of trial.choices.entries()) {
        buttonGroupElement.insertAdjacentHTML("beforeend", trial.button_html(choice, choiceIndex));
        const buttonElement = buttonGroupElement.lastChild;
        buttonElement.dataset.choice = choiceIndex.toString();
        buttonElement.addEventListener("click", () => {
          after_response(choiceIndex);
        });
      }
      display_element.appendChild(buttonGroupElement);
      if (trial.prompt !== null) {
        display_element.insertAdjacentHTML("beforeend", trial.prompt);
      }
      trial.stimulus(canvasElement);
      var start_time = performance.now();
      var response = {
        rt: null,
        button: null
      };
      const end_trial = () => {
        var trial_data = {
          rt: response.rt,
          response: response.button
        };
        this.jsPsych.finishTrial(trial_data);
      };
      function after_response(choice) {
        var end_time = performance.now();
        var rt = Math.round(end_time - start_time);
        response.button = parseInt(choice);
        response.rt = rt;
        stimulusElement.classList.add("responded");
        for (const button of buttonGroupElement.children) {
          button.setAttribute("disabled", "disabled");
        }
        if (trial.response_ends_trial) {
          end_trial();
        }
      }
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          stimulusElement.style.visibility = "hidden";
        }, trial.stimulus_duration);
      }
      if (trial.trial_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          end_trial();
        }, trial.trial_duration);
      }
    }
    simulate(trial, simulation_mode, simulation_options, load_callback) {
      if (simulation_mode == "data-only") {
        load_callback();
        this.simulate_data_only(trial, simulation_options);
      }
      if (simulation_mode == "visual") {
        this.simulate_visual(trial, simulation_options, load_callback);
      }
    }
    create_simulation_data(trial, simulation_options) {
      const default_data = {
        rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true),
        response: this.jsPsych.randomization.randomInt(0, trial.choices.length - 1)
      };
      const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
      this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
      return data;
    }
    simulate_data_only(trial, simulation_options) {
      const data = this.create_simulation_data(trial, simulation_options);
      this.jsPsych.finishTrial(data);
    }
    simulate_visual(trial, simulation_options, load_callback) {
      const data = this.create_simulation_data(trial, simulation_options);
      const display_element = this.jsPsych.getDisplayElement();
      this.trial(display_element, trial);
      load_callback();
      if (data.rt !== null) {
        this.jsPsych.pluginAPI.clickTarget(
          display_element.querySelector(
            `#jspsych-canvas-button-response-btngroup [data-choice="${data.response}"]`
          ),
          data.rt
        );
      }
    }
  }

  return CanvasButtonResponsePlugin;

})(jsPsychModule);
