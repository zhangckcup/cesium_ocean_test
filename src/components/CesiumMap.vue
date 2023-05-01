<template>
  <div class="container">
    <div id="cesiumContainer"></div>
    <canvas id="myCanvas"></canvas>

    <div class="measure">
      <ul>
        <li v-on:click="submergenceAnalysis()">淹没分析</li>
      </ul>
    </div>
    <SubmergAnalysis v-if="submergAna" v-bind:viewer="viewer"></SubmergAnalysis>
    <div id="credit"></div>
    <PositionMouse v-bind:viewer="viewer"></PositionMouse>
  </div>
</template>

<script>
import Cesium from "cesium/Source/Cesium";
import Viewer from "cesium/Source/Widgets/Viewer/Viewer";
import buildModuleUrl from "cesium/Source/Core/buildModuleUrl";
import "cesium/Source/Widgets/widgets.css";
import Base from "../modules/Base";
import HeatMap from "../modules/heatmap";
import PositionMouse from "./PositionMouse.vue";
import SubmergAnalysis from "./SubmergAnalysis.vue";

export default {
  name: "CesiumMap",
  mounted: function() {
    // buildModuleUrl.setBaseUrl("../static/cesium/");
    buildModuleUrl.setBaseUrl("../cesium/");
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5ZWFkNWZkZi05NjY5LTQ0YzUtYmUyMC05NWM4NzU1NzljNDIiLCJpZCI6MjA1MjEsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1Nzc2OTE0MjB9.KqGtpq8IeHguApGlbP2kAtQ254mN-SI5FrKN4W4eils';

    let opts = {
      animation: false, //是否显示动画控件
      baseLayerPicker: false, //是否显示图层选择控件
      geocoder: false, //是否显示地名查找控件
      timeline: false, //是否显示时间线控件
      sceneModePicker: false, //是否显示投影方式控件
      navigationHelpButton: false, //是否显示帮助信息控件
      infoBox: false, //是否显示点击要素之后显示的信息
      homeButton: false,
      selectionIndicator: false,
      creditContainer: "credit",
      shouldAnimate: true,
      //shadows: true,
      // terrainProvider: Cesium.createWorldTerrain({
      //   requestVertexNormals: true
      // })
      //terrainProvider: Base.addLocalTerrainLayer(),
      terrainProvider: Cesium.createWorldTerrain(),
      // imageryProvider: Base.addLocalImageLayer(),
      //imageryProvider: Base.addBaseImageLayer()

    };
    this.viewer = new Viewer("cesiumContainer", opts);
    var viewer = this.viewer;
    this.base = new Base(viewer);
    this.base.showBeijingPositon();
    // 深度检测
    viewer.scene.globe.depthTestAgainstTerrain = true;
    //this.base.get3Dtiles();
  },
  data() {
    return {
      viewer: {},
      selected: false,
      profileShow: false,
      profileData: null,
      submergAna: false,
      slopEle: false,
      viewshed3D: false,
      queryBuf: false,
      networkAna: false
    };
  },
  components: {
    PositionMouse,
    SubmergAnalysis,
  },
  methods: {
    measureTriangle: function() {
      this.remove();
      this.measureTri = new MeasureTriangle(
        this.viewer,
        false,
        {
          labelStyle: {
            font: "15px sans-serif",
            pixelOffset: new Cesium.Cartesian2(0.0, -30),
            fillColor: new Cesium.Color(1, 1, 1, 1),
            showBackground: true,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          lineStyle: {
            width: 2,
            material: Cesium.Color.CHARTREUSE
          }
        },
        () => {}
      );
    },
    measureDistance: function() {
      this.remove();
      this.measureDis = new MeasureDistance(
        this.viewer,
        false,
        {
          labelStyle: {
            pixelOffset: new Cesium.Cartesian2(0.0, -30),
            fillColor: new Cesium.Color(1, 1, 1, 1),
            showBackground: true,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          lineStyle: {
            width: 2,
            material: Cesium.Color.CHARTREUSE
            // 是否贴地
            // clampToGround: true,
          }
        },
        () => {}
      );
    },

    measureArea: function() {
      this.remove();
      this.measureAre = new MeasureArea(this.viewer, false, {
        labelStyle: {
          pixelOffset: new Cesium.Cartesian2(0.0, -30),
          fillColor: new Cesium.Color(1, 1, 1, 1),
          showBackground: true,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        lineStyle: {
          width: 1,
          material: Cesium.Color.CHARTREUSE
        },
        polyStyle: {
          hierarchy: {},
          outline: true,
          outlineColor: Cesium.Color.MAGENTA,
          outlineWidth: 2,
          material: Cesium.Color.CHARTREUSE,
          // 默认贴地
          arcType: Cesium.ArcType.GEODESIC
        }
      });
    },

    remove: function() {
      if (this.measureAre) {
        this.measureAre.remove();
        this.measureAre = null;
      }
      if (this.measureDis) {
        this.measureDis.remove();
        this.measureDis = null;
      }
      if (this.measureTri) {
        this.measureTri.remove();
        this.measureTri = null;
      }
      if (this.profileObj) {
        this.profileObj.remove();
        this.profileObj = null;
        this.profileShow = false;
      }
      if (this.viewSlightLine) {
        this.viewSlightLine.remove();
        this.viewSlightLine = null;
      }
      if (this.clipTerrainObj) {
        this.clipTerrainObj.remove();
        this.clipTerrainObj = null;
      }
      if (this.viewShedObj) {
        this.viewShedObj.remove();
        this.viewShedObj = null;
      }
      if (this.heatMapObj) {
        this.heatMapObj.show(false);
      }
    },
    heatMap: function() {
      const data = [];
      //  west: -74.013069,
      //     east:  40.7014,
      //      south: -73.9957,
      //      north: 40.7265
      const bounds = {
        west: -74.013069,
        south: 40.7014,
        east: -73.9957,
        north: 40.7265
      };

      for (let index = 0; index < 100; index++) {
        const element = {
          x: bounds.west + (bounds.east - bounds.west) * Math.random(),
          y: bounds.south + (bounds.north - bounds.south) * Math.random(),
          value: Math.random() * 100
        };
        data.push(element);
      }
      // console.log(JSON.stringify(data));
      if (!this.heatMapObj) {
        this.heatMapObj = new HeatMap(this.viewer, data, bounds);
      } else {
        this.viewer.zoomto(this.heatMapObj.heatMap._layer);
      }
    },
    createProfile: function() {
      this.profileShow = false;
      this.profileObj = new DrawProfile(
        this.viewer,
        {
          lineStyle: {
            width: 2,
            material: Cesium.Color.CHARTREUSE,

            // 是否贴地
            clampToGround: true
          }
        },
        data => {
          this.profileShow = true;
          this.profileData = data;
        }
      );
    },
    add3DTiles: function() {
      // Load the NYC buildings tileset
    /*  if (!this.tilesetObj) {
        var tileset = this.base.get3Dtiles();
        this.viewer.scene.primitives.add(tileset);
        this.tilesetObj = tileset;
      }*/
      this.base.show3DtilesPosition();
      // if (!this.tilesetObj) {
      /*var tileset = this.base.addBJBuilding3Dtiles();
      this.viewer.scene.primitives.add(tileset);*/
      // this.tilesetObj = tileset;
      // }
    },
    createViewLine: function(type = 0) {
      this.remove();
      this.viewSlightLine = new DrawViewLine(
        this.viewer,
        type,
        {
          lineStyle: {
            width: 2,
            material: Cesium.Color.CHARTREUSE
            // 是否贴地
            // clampToGround: true,
          }
        },
        data => {
          this.profileShow = true;
          this.profileData = data;
        }
      );
    },
    submergenceAnalysis: function() {
      this.submergAna = !this.submergAna;
    },
    createViewShed: function() {
      if (!this.viewShedObj) {
        // this.viewShedObj = new ViewShed3D(this.viewer);
        this.viewShedObj = new DrawViewShed3D(
          this.viewer,
          false,
          {
            labelStyle: {
              font: "15px sans-serif",
              pixelOffset: new Cesium.Cartesian2(0.0, -30),
              fillColor: new Cesium.Color(1, 1, 1, 1),
              showBackground: true,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            lineStyle: {
              width: 2,
              material: Cesium.Color.CHARTREUSE
            }
          },
          () => {}
        );
      }
    },
    clipTerrainGro: function() {
      if (!this.clipTerrainObj) {
        this.clipTerrainObj = new ClipTerrain(this.viewer);
      }
    },
    slopElevationAnalysis: function() {
      this.slopEle = !this.slopEle;
    },
    viewshed3DAnalysis: function() {
      this.viewshed3D = !this.viewshed3D;
    },
    queryBufferAnalysis: function() {
      this.queryBuf = !this.queryBuf;
    },
    queryAnalysis: function() {
      this.queryPolygon = new QueryByPolygon(this.viewer, false, {
        labelStyle: {
          pixelOffset: new Cesium.Cartesian2(0.0, -30),
          fillColor: new Cesium.Color(1, 1, 1, 1),
          showBackground: true,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        lineStyle: {
          width: 1,
          material: Cesium.Color.CHARTREUSE
        },
        polyStyle: {
          hierarchy: {},
          outline: true,
          outlineColor: Cesium.Color.MAGENTA,
          outlineWidth: 2,
          material: Cesium.Color.CHARTREUSE,
          // 默认贴地
          arcType: Cesium.ArcType.GEODESIC
        }
      });
    },
    networkAnalysis: function() {
      this.networkAna = !this.networkAna;
    }
  }
};
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#credit {
  display: none;
}

.measure {
  position: absolute;
  top: 1px;
  background-color: #555758;
  padding: 5px;
  height: 30px;
  color: #fff;
}

ul {
  margin: 0;
  padding: 0;
}

ul li {
  list-style-type: none;
  float: left;
  cursor: pointer;
  margin: 0px 3px;
  border: 1px;
}

.btn-sel {
  border: 1px;
}

.btn {
  border: 0px;
}

#menu {
  position: absolute;
  top: 50px;
}
</style>
