import Cesium from 'cesium/Source/Cesium'
export default class CesiumDrawing {
    /**
     * 鼠标交互绘制线和多边形
     * @param {Viewer}} viewer Cesium Viewer
     * @param {*} options
     */
    constructor(viewer) {
        if (viewer instanceof Cesium.Viewer === false) {
            throw new Error('viewer不是一个有效的Cesium Viewer')
        }

        this.viewer = viewer
        /*heightReference 定义几何图形的高程基准
        *CLAMP_TO_GROUND:依附地形
        *CLAMP_TO_MODEL:依附模型
        *NONE:空间线
        */
        this._heightReference = 'CLAMP_TO_GROUND'
        this._material = undefined
        this._style = {}
        this.tempPoints = []
        this.positionList = []
        this.shapeEntities = []

        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        //this._initViewStatus(this.viewer)
        this._addDisListener()
    }
   /* _initViewStatus(viewer) {
        var scene = viewer.scene
        scene.globe.depthTestAgainstTerrain = true
        scene.camera.setView({
            // 摄像头的位置
            destination: Cesium.Cartesian3.fromDegrees(115.9216, 39.9870, 1500.0),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),//默认朝北0度，顺时针方向，东是90度
                pitch: Cesium.Math.toRadians(-20),//默认朝下看-90,0为水平看，
                roll: Cesium.Math.toRadians(0)//默认0
            }
        });
        //viewer.skyAtmosphere = false
    }*/
    _addDisListener() {
        let viewer = this.viewer
        let positionList = this.positionList

        viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
        // 绘制线
        this._drawLine(positionList)
        this._getDegrees()
        this._drawShape(positionList);
    }
       getpoints(){
        let position = this.positionList;
           if(!Cesium.defined(position)){
               position=new Cesium.CallbackProperty(function () {
                   return position
               })
           }
       }

    _reDraw() {
        this.tempPoints = []
        this.positionList.length = 0
        /*for (let entity of this.shapeEntities) {
            this.viewer.entities.remove(entity)
        }*/
        //this.shapeEntities = []
    }
    _getDegrees(){
        let viewer = this.viewer
        let scene = viewer.scene
        let positionList = this.positionList;
        let that = this
        let isDraw = false
        let reDraw = false
        that.handler.setInputAction((movement) => {
            if (reDraw) {
                this._reDraw()
                reDraw = false
            }

            let cartesian = null
            let ray = viewer.camera.getPickRay(movement.position);
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
                positionList.push(cartesian.clone());

            }
            isDraw = true
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        that.handler.setInputAction((movement) => {
            if (isDraw) {
                let cartesian = that.isTerrain === true ? scene.pickPosition(movement.endPosition) : viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
                let ray = viewer.camera.getPickRay(movement.endPosition);
                cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                if (cartesian) {
                    if (positionList.length > 1) {
                        positionList.pop();
                        positionList.push(cartesian.clone());
                    }
                    if (positionList.length === 1) {
                        positionList.push(cartesian.clone());
                    }
                }

            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        that.handler.setInputAction((movement) => {
            if (isDraw) {
                let cartesian = this.isTerrain === true ? scene.pickPosition(movement.position) : viewer.camera.pickEllipsoid(movement.position, scene.globe.ellipsoid);
                let ray = viewer.camera.getPickRay(movement.position);
                cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                if (cartesian) {
                    var tempLength = this.positionList.length;
                    if (tempLength < 2) {
                        //alert('请选择3个以上的点再执行闭合操作命令');
                        this._reDraw()
                        return;
                    }
                    if (positionList.length > 2) {
                        positionList.pop();
                        positionList.push(cartesian.clone());
                    }
                }
                isDraw = false
                reDraw = true

            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        this.tempPoints.push(positionList);
        return positionList;
    }
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
        this.shapeEntities.push(entity)
    }
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
                this.shapeEntities.push(entity);
            }
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
    clear(){
        for (let entity of this.shapeEntities) {
            this.viewer.entities.remove(entity)
        }
    }
}
