import React, { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

const Map = () => {
  const MapEl = useRef(null);

  useEffect(() => {
    loadModules([
      "esri/Map",
      "esri/views/MapView",
      "esri/layers/FeatureLayer",
      "esri/smartMapping/statistics/histogram",
      "esri/smartMapping/statistics/summaryStatistics",
      "esri/widgets/Histogram",
      "esri/Color",
      "esri/core/promiseUtils",
    ]).then(
      ([
        Map,
        MapView,
        FeatureLayer,
        histogram,
        summaryStatistics,
        Histogram,
        Color,
        promiseUtils,
      ]) => {
        const layerColor = new Color("rgba(221, 68, 65, 0.8)");

        const layer = new FeatureLayer({
          portalItem: {
            id: "5f4d25bbc83e440c98585f3feb179a0c",
          },
          effect: "drop-shadow(2px 2px 2px gray)",
          popupTemplate: {
            title: "{nom_mun}, {nom_ent}",
            content: "Population: {pobtot}",
            fieldInfos: [
              {
                fieldName: "pobtot",
                format: {
                  places: 0,
                  digitSeparator: true,
                },
              },
            ],
          },
          renderer: {
            type: "class-breaks",
            backgroundFillSymbol: {
              type: "simple-fill",
              color: [240, 240, 240, 1],
              outline: {
                width: 0.3,
                color: [200, 200, 200, 0.5],
              },
            },
            field: "pobtot",
            classBreakInfos: [
              {
                minValue: -99999999999,
                maxValue: 99999999999,
                symbol: {
                  type: "simple-marker",
                  color: layerColor,
                  size: 3,
                  outline: {
                    width: 0.5,
                    color: "rgba(255,255,255,0.5)",
                  },
                },
              },
            ],
            visualVariables: [
              {
                type: "size",
                field: "pobtot",
                minDataValue: 10000,
                maxDataValue: 2000000,
                minSize: 3,
                maxSize: 40,
              },
            ],
          },
        });

        const view = new MapView({
          container: "viewDiv",
          map: new Map({
            basemap: {
              baseLayers: [
                new FeatureLayer({
                  portalItem: {
                    id: "2b93b06dc0dc4e809d3c8db5cb96ba69",
                  },
                  effect: "drop-shadow(0px 0px 15px #cae7f1)",
                  legendEnabled: false,
                  popupEnabled: false,
                  renderer: {
                    type: "simple",
                    symbol: {
                      type: "simple-fill",
                      color: [225, 225, 225, 1],
                      outline: {
                        color: "white",
                        width: 0.5,
                      },
                    },
                  },
                }),
              ],
            },
            layers: [layer],
          }),
          viewpoint: {
            rotation: 0,
            scale: 11443105,
            targetGeometry: {
              type: "point",
              spatialReference: {
                wkid: 6368,
              },
              x: 770969.1489199842,
              y: 2692494.7942999783,
            },
          },
          spatialReference: {
            wkid: 6368,
          },
          highlightOptions: {
            fillOpacity: 0.1,
            haloColor: layerColor,
            color: layerColor,
          },
          constraints: {
            minScale: 11443105,
            geometry: {
              type: "extent",
              spatialReference: {
                wkid: 6368,
              },
              xmin: -1464958,
              ymin: 1654007,
              xmax: 3006896,
              ymax: 3730982,
            },
          },
        });
        view.ui.add("containerDiv", "bottom-left");
        view.ui.add("titleDiv", "top-right");

        const normalizationTypeElement =
          document.getElementById("normalization-type");

        view.when().then(createHistogram);

        normalizationTypeElement.addEventListener("change", createHistogram);

        async function fetchStats(field) {
          const normalizationType =
            normalizationTypeElement.value === "none"
              ? null
              : normalizationTypeElement.value;
          const params = {
            layer,
            field,
            numBins: 30,
            normalizationType,
            normalizationTotal:
              normalizationType === "percent-of-total" ? 126014024 : null,
            minValue: 0,
            maxValue: !normalizationType
              ? 75000
              : normalizationType === "percent-of-total"
              ? 0.1
              : null,
          };

          return promiseUtils.eachAlways([
            histogram(params),
            summaryStatistics(params),
          ]);
        }

        let histogramWidget;

        async function createHistogram() {
          // fetches summary statistics and histogram bins
          // from the feature service
          fetchStats("pobtot")
            .then(function (response) {
              const histogramResult = response[0].value;
              const statsResult = response[1].value;

              const normType = normalizationTypeElement.value;

              const minElement = document.getElementById("min");
              const maxElement = document.getElementById("max");
              minElement.innerText = formatLabel(histogramResult.minValue);
              const suffix =
                normType === "none" || normType === "percent-of-total"
                  ? "+"
                  : "";
              maxElement.innerText =
                formatLabel(histogramResult.maxValue) + suffix;

              // Creates a Histogram instance from the returned histogram result
              if (!histogramWidget) {
                histogramWidget =
                  Histogram.fromHistogramResult(histogramResult);
                histogramWidget.container = "histogram";
                histogramWidget.barCreatedFunction = (index, element) => {
                  element.setAttribute("fill", layerColor.toHex());
                  element.setAttribute("opacity", 0.8);
                };
              } else {
                histogramWidget.min = histogramResult.minValue;
                histogramWidget.max = histogramResult.maxValue;
                histogramWidget.bins = histogramResult.bins;
              }
              histogramWidget.average = statsResult.avg;
              histogramWidget.labelFormatFunction = function (value, type) {
                return formatLabel(value);
              };
            })
            .catch(function (error) {
              console.error(error);
            });
        }

        function formatLabel(value) {
          if (normalizationTypeElement.value === "none") {
            return Math.round(value).toLocaleString();
          }
          if (normalizationTypeElement.value === "percent-of-total") {
            return (value * 100).toLocaleString() + "%";
          }
          return value.toLocaleString();
        }
      }
    );
  }, []);

  return (
    <>
      <div
        id="viewDiv"
        style={{ height: "100vh", width: "100vw" }}
        ref={MapEl}
      ></div>
      <div id="titleDiv" className="esri-widget">
        <div id="titleText">Total Population</div>
        <div>Censo Mexico 2020</div>
      </div>
      <div id="containerDiv" class="esri-widget">
        <div id="histogram-title" class="esri-widget">
          Population
        </div>
        <div className="padding">
          <div>Normalization type:</div>
          <select id="normalization-type" class="esri-select">
            <option value="none">None</option>
            <option value="log" selected>
              Log
            </option>
            <option value="natural-log">Natural log</option>
            <option value="square-root">Square root</option>
            <option value="percent-of-total">Percent of total</option>
          </select>
        </div>
        <div id="histogram"></div>
        <div className="labels esri-widget">
          <span style={{ float: "left" }} id="min"></span>
          <span style={{ float: "right" }} id="max"></span>
        </div>
      </div>
    </>
  );
};

export default Map;
