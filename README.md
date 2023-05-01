# cesium

> 之前写的 Cesium 相关代码，现在已经看不懂了哈哈。
> 
> 包含了海洋数据库项目的淹没分析、视线分析等代码。

## Project setup

```
yarn install
```

### Compiles and hot-reloads for development

```
yarn run serve
```

### Compiles and minifies for production

```
yarn run build
```

## 说明

cesium 1.54版本

1. 修改源码：
路径：D:\ly\ab_cesium\SpatialNalysis\sn_cesium\node_modules\cesium\Source\Core\Cartesian3.js
第422行，注释了，否则 动态更改视域摄像头报错，无法进行渲染
//throw new DeveloperError('normalized result is not a number');
2. 路径：D:\ly\ab_cesium\SpatialNalysis\sn_cesium\node_modules\cesium\Source\Scene\ShadowMap.js
247行，控制 阴影渲染范围只有摄像头扫过的地方
this._cascadesEnabled =false;// this._isPointLight ? false : defaultValue(options.cascadesEnabled, true);
282，283行，原来是false，改成true，可以观察视锥体范围
  this.debugShow = true;
  this.debugFreezeFrame = true;
3. 修改视锥体的样式
路径：D:\ly\ab_cesium\SpatialNalysis\sn_cesium\node_modules\cesium\Source\Scene\DebugCameraPrimitive.js
 第183行：原来是0.2，更改为0.0，去掉填充
color : ColorGeometryInstanceAttribute.fromColor(Color.fromAlpha(this._color, 0.0, scratchColor))

//////////////////////////

如果是dem的视域范围，就是一个圆周，设置 是点光源即可
 this._isPointLight =true;//defaultValue(options.isPointLight, false);
 this._pointLightRadius = defaultValue(options.pointLightRadius, 600.0);
如果 是 透视图，则需要
设置
this.debugShow = true;
        this.debugFreezeFrame = true;
两个属性，可以动态调试显示视域范围
