
import Cesium from 'cesium/Source/Cesium'
// 淹没分析
export default class SubmergenceAnalysis {
    constructor(viewer, isTerrain = true, height_max, speed, map_type) {
        this.viewer = viewer
        this.isTerrain = isTerrain
        this.handler = null
        this.tempEntities = []
        this.polygonEntities = []
        this.linePositionList = []
        this.tempPoints = []
        this.extrudedHeight = 0
        this.height_max = Number(height_max)
        this.speed = Number(speed)
        // 默认是范围图/深度图
        this.map_type = map_type
        //this.polygon_degrees = []
        this.polygon_degrees = [
           /* 110.0441,24.7279,
            112.5232,24.2286,
            112.3635,21.7401,
            109.6537,21.6635*/
        ]
        //this._initViewStatus(this.viewer)
        //this._listener()
        this._addDisListener()
    }
    // 根据矩形范围得到行列数点坐标和高程信息
    _getPoints(xmin, xmax, ymin, ymax) {
        const x_count = 10
        const y_count = 10
        let cartesians = new Array(x_count * y_count);
        const x_d = (xmax - xmin) / x_count
        for (var i = 0; i < x_count; ++i) {
            const start_pt = { x: xmin + i * x_d, y: ymax }
            const end_pt = { x: xmin + i * x_d, y: ymin }
            for (let j = 0; j < y_count; j++) {
                const offset = j / (y_count - 1);
                const x = Cesium.Math.lerp(start_pt.x, end_pt.x, offset);
                const y = Cesium.Math.lerp(start_pt.y, end_pt.y, offset);
                cartesians[j + i * y_count] = Cesium.Cartographic.fromDegrees(x, y);
            }
        }
        return cartesians

    }
    _getHeights(cartesians, extrudedHeight, callback) {
        var terrainProvider = new Cesium.CesiumTerrainProvider({
            url: "http://localhost:8080/o_lab"
        })
        // 根据地形计算某经纬度点的高度
        var promise = Cesium.sampleTerrainMostDetailed(terrainProvider, cartesians);
        Cesium.when(promise, function (updatedPositions) {

            let positions = updatedPositions.filter(d => {
                const cartographic = d
                if (cartographic) {
                    const h_d = extrudedHeight - cartographic.height
                    return h_d > 0
                }
            })
            positions = positions.map(d => {
                const cartographic = d
                let h = extrudedHeight - cartographic.height
                return {
                    x: Cesium.Math.toDegrees(cartographic.longitude),
                    y: Cesium.Math.toDegrees(cartographic.latitude),
                    value: h
                }

            })

            if (callback) {

                callback(positions)
            }
        });
    }


    _addDisListener() {
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        let viewer = this.viewer
        let scene = viewer.scene
        let isDraw = false
        let reDraw = false
        let linePositionList = this.linePositionList
        // 绘制线
        this._drawLine(linePositionList)
        //绘制淹没区域
        this._drawShape(linePositionList)

        this.handler.setInputAction((movement) => {
            if (reDraw) {
                this._reDraw()
                reDraw = false
            }

            let cartesian = null
            let ray = viewer.camera.getPickRay(movement.position);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
                linePositionList.push(cartesian.clone());
               let local = this._car3ToLatLon(cartesian)
                this.polygon_degrees.push(local.lon);
                this.polygon_degrees.push(local.lat);
            }
            isDraw = true
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.handler.setInputAction((movement) => {
            if (isDraw) {
                let cartesian = this.isTerrain === true ? scene.pickPosition(movement.endPosition) : viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
                let ray = viewer.camera.getPickRay(movement.endPosition);
                cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                if (cartesian) {
                    if (linePositionList.length > 1) {
                        linePositionList.pop();
                        linePositionList.push(cartesian.clone());
                    }
                    if (linePositionList.length === 1) {
                        linePositionList.push(cartesian.clone());
                    }
                }

            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        this.handler.setInputAction((movement) => {
            if (isDraw) {
                let cartesian = this.isTerrain === true ? scene.pickPosition(movement.position) : viewer.camera.pickEllipsoid(movement.position, scene.globe.ellipsoid);
                let ray = viewer.camera.getPickRay(movement.position);
                cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                if (cartesian) {
                    var tempLength = this.linePositionList.length;
                    if (tempLength < 2) {
                        //alert('请选择3个以上的点再执行闭合操作命令');
                        this._reDraw()
                        return;
                    }
                    if (linePositionList.length > 2) {
                        linePositionList.pop();
                        linePositionList.push(cartesian.clone());
                        let local = this._car3ToLatLon(cartesian)
                        this.polygon_degrees.push(local.lon)
                        this.polygon_degrees.push(local.lat)
                    }
                }
                isDraw = false
                reDraw = true

            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        // 绘制面
        //this._drawPoly(linePositionList)

    }
    _reDraw() {
        this.tempPoints = []
        this.linePositionList.length = 0
        this.polygon_degrees = []
        //this.areaPositionList.length = 0
        for (let entity of this.polygonEntities) {
            this.viewer.entities.remove(entity)
        }
        this.polygonEntities = []
        // 绘制线
        this._drawLine(this.linePositionList)
        //绘制淹没区域
        this._drawShape(this.linePositionList)
    }
    //绘制选取范围
    _drawShape(position) {
        const entity = this.viewer.entities.add({
            polygon:{
                hierarchy: {},
                material: new Cesium.Color.fromBytes(64, 157, 253, 20),
                //material: new Cesium.ColorMaterialProperty(new Cesium.Color(205, 139, 14, 1)),
                outline: true,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth:3
            }
        });
        entity.polygon.hierarchy = new Cesium.CallbackProperty(() => {
            return position;
        }, false)
        if(entity!=null){
            this.polygonEntities.push(entity);
        }
    }
    //绘制线
    _drawLine(linePositionList) {
        let lineStyle = {
            width: 1,
            material: Cesium.Color.fromBytes(64, 157, 253, 20),
            clampToGround:true,
        }

        let entity = this.viewer.entities.add({
            polyline: lineStyle,
        })

        entity.polyline.positions = new Cesium.CallbackProperty(function () {
            return linePositionList
        }, false)

        this.polygonEntities.push(entity)
    }
    _drawPoint(point_Cartesian3) {
        let entity =
            this.viewer.entities.add({
                position: point_Cartesian3,
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.GOLD,
                    // disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            })
        this.tempEntities.push(entity)
    }

    //绘制淹没结果
    _drawPoly(degrees) {
        /*let poly_degree = [];
        for (let point of degrees){
            let result = this._car3ToLatLon(point)
            poly_degree.push(Number(result.lon));
            poly_degree.push(Number(result.lat));
        }*/
        console.log(degrees)
        const that = this
        let entity =
            this.viewer.entities.add({
                polygon: {
                    hierarchy: {},
                    material: new Cesium.Color.fromBytes(64, 157, 253, 100),
                  /*  material: new Cesium.Material({
                        fabric : {
                            type : 'Water',
                            uniforms : {
                                //baseWaterColor:new Cesium.Color(0.0, 0.0, 1.0, 0.5),
                                //blendColor: new Cesium.Color(0.0, 0.0, 1.0, 0.5),
                                //specularMap: 'gray.jpg',
                                normalMap: './waterNormals.jpg',
                                //normalMap: '本地贴图地址 或 base64',
                                frequency: 1000.0,
                                animationSpeed: 0.01,
                                amplitude: 10.0
                        }
                        }
                    }),*/
                    perPositionHeight: true,

                }
            })
        entity.polygon.hierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(degrees))
       /* entity.polygon.hierarchy = new Cesium.CallbackProperty(() => {
            return degrees;
        }, false)*/

        entity.polygon.extrudedHeight = new Cesium.CallbackProperty(() => that.extrudedHeight, false)
        this.polygonEntities.push(entity)
    }

    // 世界坐标转经纬坐标
    _car3ToLatLon(cartesian) {
        let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        let longitudeString = Cesium.Math.toDegrees(cartographic.longitude)
        let latitudeString = Cesium.Math.toDegrees(cartographic.latitude)
        return {
            lon: longitudeString,
            lat: latitudeString,
            height: cartographic.height
        }
    }
    //移除整个资源
    remove() {
        let viewer = this.viewer
        for (let tempEntity of this.tempEntities) {
            viewer.entities.remove(tempEntity)
        }
        for (let lineEntity of this.polygonEntities) {
            viewer.entities.remove(lineEntity)
        }
        this.handler.destroy()
    }
    start() {
        const that = this
        that.extrudedHeight = 0;
        this.timer = window.setInterval(() => {
            if ((that.height_max >= that.extrudedHeight)) {
                that.extrudedHeight = that.extrudedHeight + that.speed
            } else {
                //that.extrudedHeight = 0;
                window.clearInterval(this.timer)
                //that.extrudedHeight = that.height_max
            }

        }, 500)
            that._drawPoly(this.polygon_degrees)
    }
    clear() {
        let viewer = this.viewer
        //this.handler = null;
        if (this.timer) {
            window.clearInterval(this.timer)
            this.timer = null
        }
        this.extrudedHeight = 0;

        for (let entity of this.polygonEntities) {
            viewer.entities.remove(entity)
        }
        this.linePositionList.length = 0
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
    changeMapType(type) {
        if (!type) {
            if (!this.heatMapObj) {
                // 得到插值网格
                const bounds = {
                    west: 115.8784,
                    east: 115.9614,
                    south: 39.9912,
                    north: 40.0381
                }
                const positions_cartesian = this._getPoints(bounds.east, bounds.west, bounds.south, bounds.north)
                this._getHeights(positions_cartesian, this.extrudedHeight, (d) => {
                    this.heatMapObj = new HeatMap(this.viewer, d, bounds);
                })
            }

            this.heatMapObj && this.heatMapObj.show(true)
            for (let entity of this.polygonEntities) {
                entity.show = false;
            }
        } else {
            this.heatMapObj.show(false)
            for (let entity of this.polygonEntities) {
                entity.show = true;
            }
        }
    }

    // 切割一部分地形
   /* loadGrandCanyon() {
        var globe = this.viewer.scene.globe;
        const viewer = this.viewer
        // viewer.skyAtmosphere = false,
        // Pick a position at the Grand Canyon
        var position = Cesium.Cartographic.toCartesian(new Cesium.Cartographic.fromDegrees(115.9165534, 40.0139345, 100));
        var distance = 3000.0;
        var boundingSphere = new Cesium.BoundingSphere(position, distance);

        globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
            modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
            planes: [
                new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), distance),
                new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), distance),
                new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), distance),
                new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), distance)
            ],
            unionClippingRegions: true
        });
        globe.clippingPlanes.enabled = true;
        viewer.camera.viewBoundingSphere(boundingSphere, new Cesium.HeadingPitchRange(0.5, -0.5, boundingSphere.radius * 5.0));
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }*/

}
