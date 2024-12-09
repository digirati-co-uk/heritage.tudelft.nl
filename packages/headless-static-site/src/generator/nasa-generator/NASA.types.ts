export interface SearchParams {
  q?: string;
  center?: string;
  description?: string;
  description_508?: string;
  keywords?: string[];
  location?: string;
  media_type?: MediaTypes[];
  nasa_id?: string;
  page?: number;
  photographer?: string;
  secondary_creator?: string;
  title?: string;
  year_start?: number;
  year_end?: number;
}

type MediaTypes = 'image' | 'audio';

export interface AssetResponse {
  collection: {
    version: string;
    href: string;
    items: Array<Link>;
  };
}

export interface CollectionResponse<T> {
  collection: {
    href: string;
    items: Array<CollectionItem<T>>;
    links: Array<Link>;
    metadata: {
      total_hits: number;
    };
    version: string;
  };
}

export interface SearchCollectionItem {
  center: string;
  date_created: string;
  description: string;
  keywords: string[];
  media_type: MediaTypes;
  nasa_id: string;
  title: string;
}

export interface Link {
  href: string;
  rel?: string;
  render?: string; // image
}

export interface CollectionItem<T> {
  data: Array<T>;
  href: string;
  links: Array<Link>;
}

export interface XMP {
  'XMP:AlreadyApplied': string;
  'XMP:ApertureValue': string;
  'XMP:ApproximateFocusDistance': string;
  'XMP:AutoLateralCA': string;
  'XMP:Blacks2012': string;
  'XMP:BlueHue': string;
  'XMP:BlueSaturation': string;
  'XMP:Brightness': string;
  'XMP:CameraProfile': string;
  'XMP:CaptionWriter': string;
  'XMP:City': string;
  'XMP:Clarity': string;
  'XMP:Clarity2012': string;
  'XMP:ColorNoiseReduction': string;
  'XMP:ColorNoiseReductionDetail': string;
  'XMP:ColorTemperature': string;
  'XMP:Contrast': string;
  'XMP:Contrast2012': string;
  'XMP:ConvertToGrayscale': boolean;
  'XMP:Country': string;
  'XMP:CreateDate': string;
  'XMP:Creator': string[];
  'XMP:CreatorAddress': string;
  'XMP:CreatorCity': string;
  'XMP:CreatorCountry': string;
  'XMP:CreatorRegion': string;
  'XMP:CreatorTool': string;
  'XMP:CreatorWorkURL': string;
  'XMP:Credit': string;
  'XMP:CropAngle': string;
  'XMP:CropBottom': string;
  'XMP:CropConstrainToWarp': string;
  'XMP:CropHeight': string;
  'XMP:CropLeft': string;
  'XMP:CropRight': string;
  'XMP:CropTop': string;
  'XMP:CropUnit': string;
  'XMP:CropWidth': string;
  'XMP:CustomRendered': string;
  'XMP:DateCreated': string;
  'XMP:DateTimeDigitized': string;
  'XMP:DateTimeOriginal': string;
  'XMP:Defringe': string;
  'XMP:DerivedFromDocumentID': string;
  'XMP:DerivedFromOriginalDocumentID': string;
  'XMP:Description': string;
  'XMP:DocumentID': string;
  'XMP:ExifVersion': string;
  'XMP:Exposure': string;
  'XMP:Exposure2012': number;
  'XMP:ExposureCompensation': string;
  'XMP:ExposureMode': string;
  'XMP:ExposureProgram': string;
  'XMP:ExposureTime': string;
  'XMP:FNumber': string;
  'XMP:FillLight': string;
  'XMP:Firmware': string;
  'XMP:FlashCompensation': string;
  'XMP:FlashFunction': boolean;
  'XMP:FlashMode': string;
  'XMP:FlashRedEyeMode': string;
  'XMP:FlashReturn': string;
  'XMP:FocalLength': string;
  'XMP:Format': string;
  'XMP:GrainAmount': string;
  'XMP:GreenHue': string;
  'XMP:GreenSaturation': string;
  'XMP:HasCrop': string;
  'XMP:HasSettings': boolean;
  'XMP:HierarchicalSubject': string;
  'XMP:HighlightRecovery': string;
  'XMP:Highlights2012': string;
  'XMP:History': any[];
  'XMP:HistoryAction': string;
  'XMP:HistoryChanged': string[];
  'XMP:HistoryInstanceID': string;
  'XMP:HistoryParameters': string;
  'XMP:HistorySoftwareAgent': string;
  'XMP:HistoryWhen': string;
  'XMP:HueAdjustmentAqua': number;
  'XMP:HueAdjustmentBlue': number;
  'XMP:HueAdjustmentGreen': number;
  'XMP:HueAdjustmentMagenta': number;
  'XMP:HueAdjustmentOrange': number;
  'XMP:HueAdjustmentPurple': number;
  'XMP:HueAdjustmentRed': number;
  'XMP:HueAdjustmentYellow': number;
  'XMP:ISO': string;
  'XMP:ImageNumber': string;
  'XMP:InstanceID': string;
  'XMP:Instructions': string;
  'XMP:Lens': string;
  'XMP:LensID': string;
  'XMP:LensInfo': string;
  'XMP:LensManualDistortionAmount': string;
  'XMP:LensProfileEnable': string;
  'XMP:LensProfileSetup': string;
  'XMP:Location': string;
  'XMP:LuminanceAdjustmentAqua': number;
  'XMP:LuminanceAdjustmentBlue': number;
  'XMP:LuminanceAdjustmentGreen': number;
  'XMP:LuminanceAdjustmentMagenta': number;
  'XMP:LuminanceAdjustmentOrange': number;
  'XMP:LuminanceAdjustmentPurple': number;
  'XMP:LuminanceAdjustmentRed': number;
  'XMP:LuminanceAdjustmentYellow': number;
  'XMP:LuminanceSmoothing': string;
  'XMP:MaxApertureValue': string;
  'XMP:MetadataDate': string;
  'XMP:MeteringMode': string;
  'XMP:Model': string;
  'XMP:ModifyDate': string;
  'XMP:OriginalDocumentID': string;
  'XMP:ParametricDarks': string;
  'XMP:ParametricHighlightSplit': string;
  'XMP:ParametricHighlights': string;
  'XMP:ParametricLights': string;
  'XMP:ParametricMidtoneSplit': string;
  'XMP:ParametricShadowSplit': string;
  'XMP:ParametricShadows': string;
  'XMP:PerspectiveHorizontal': string;
  'XMP:PerspectiveRotate': string;
  'XMP:PerspectiveScale': string;
  'XMP:PerspectiveVertical': string;
  'XMP:PostCropVignetteAmount': string;
  'XMP:PostCropVignetteFeather': string;
  'XMP:PostCropVignetteHighlightContrast': string;
  'XMP:PostCropVignetteMidpoint': string;
  'XMP:PostCropVignetteRoundness': string;
  'XMP:PostCropVignetteStyle': string;
  'XMP:ProcessVersion': string;
  'XMP:Rating': string;
  'XMP:RedHue': string;
  'XMP:RedSaturation': string;
  'XMP:Rights': string;
  'XMP:Saturation': string;
  'XMP:SaturationAdjustmentAqua': string;
  'XMP:SaturationAdjustmentBlue': string;
  'XMP:SaturationAdjustmentGreen': string;
  'XMP:SaturationAdjustmentMagenta': string;
  'XMP:SaturationAdjustmentOrange': string;
  'XMP:SaturationAdjustmentPurple': string;
  'XMP:SaturationAdjustmentRed': string;
  'XMP:SaturationAdjustmentYellow': string;
  'XMP:SceneCaptureType': string;
  'XMP:SerialNumber': string;
  'XMP:ShadowTint': string;
  'XMP:Shadows': string;
  'XMP:Shadows2012': string;
  'XMP:SharpenDetail': string;
  'XMP:SharpenEdgeMasking': string;
  'XMP:SharpenRadius': string;
  'XMP:Sharpness': string;
  'XMP:Source': string;
  'XMP:SplitToningBalance': string;
  'XMP:SplitToningHighlightHue': string;
  'XMP:SplitToningHighlightSaturation': string;
  'XMP:SplitToningShadowHue': string;
  'XMP:SplitToningShadowSaturation': string;
  'XMP:State': string;
  'XMP:Subject': string[];
  'XMP:Tint': string;
  'XMP:Title': string;
  'XMP:ToneCurve': string;
  'XMP:ToneCurveBlue': string;
  'XMP:ToneCurveGreen': string;
  'XMP:ToneCurveName': string;
  'XMP:ToneCurveName2012': string;
  'XMP:ToneCurvePV2012': string[];
  'XMP:ToneCurvePV2012Blue': string[];
  'XMP:ToneCurvePV2012Green': string[];
  'XMP:ToneCurvePV2012Red': string[];
  'XMP:ToneCurveRed': string[];
  'XMP:TransmissionReference': string;
  'XMP:Version': string;
  'XMP:Vibrance': string;
  'XMP:VignetteAmount': string;
  'XMP:WhiteBalance': string;
  'XMP:WebStatement': string;
  'XMP:XMPToolkit': string;
  'XMP:CreatorContactInfo': any;
  'XMP:DerivedFrom': any;
  'XMP:UsageTerms': string;
}
export interface AVAIL {
  'AVAIL:Album': string | string[];
  'AVAIL:Center': string;
  'AVAIL:DateCreated': string;
  'AVAIL:Description': string;
  'AVAIL:Description508': string;
  'AVAIL:Keywords': string[];
  'AVAIL:Location': string;
  'AVAIL:MediaType': string;
  'AVAIL:Owner': string;
  'AVAIL:Photographer': string;
  'AVAIL:Title': string;
  'AVAIL:NASAID': string;
  'AVAIL:SecondaryCreator': string;
}
export interface IPTC {
  'IPTC:By-line': string;
  'IPTC:Province-State': string;
  'IPTC:OriginalTransmissionReference': string;
  'IPTC:Country-PrimaryLocationName': string;
  'IPTC:City': string;
  'IPTC:DateCreated': string;
  'IPTC:DigitalCreationTime': string;
  'IPTC:CopyrightNotice': string;
  'IPTC:Writer-Editor': string;
  'IPTC:ObjectName': string;
  'IPTC:CodedCharacterSet': string;
  'IPTC:ApplicationRecordVersion': number;
  'IPTC:Sub-location': string;
  'IPTC:DigitalCreationDate': string;
  'IPTC:Source': string;
  'IPTC:SpecialInstructions': string;
  'IPTC:Caption-Abstract': string;
  'IPTC:Keywords': string[];
  'IPTC:Credit': string;
  'IPTC:TimeCreated': string;
}
export interface IIC_Profile {
  'ICC_Profile:BlueMatrixColumn': string;
  'ICC_Profile:BlueTRC': string;
  'ICC_Profile:CMMFlags': string;
  'ICC_Profile:ColorSpaceData': string;
  'ICC_Profile:ConnectionSpaceIlluminant': string;
  'ICC_Profile:DeviceAttributes': string;
  'ICC_Profile:DeviceManufacturer': string;
  'ICC_Profile:DeviceModel': string;
  'ICC_Profile:GreenMatrixColumn': string;
  'ICC_Profile:GreenTRC': string;
  'ICC_Profile:MediaBlackPoint': string;
  'ICC_Profile:MediaWhitePoint': string;
  'ICC_Profile:PrimaryPlatform': string;
  'ICC_Profile:ProfileCMMType': string;
  'ICC_Profile:ProfileClass': string;
  'ICC_Profile:ProfileConnectionSpace': string;
  'ICC_Profile:ProfileCopyright': string;
  'ICC_Profile:ProfileCreator': string;
  'ICC_Profile:ProfileDateTime': string;
  'ICC_Profile:ProfileDescription': string;
  'ICC_Profile:ProfileFileSignature': string;
  'ICC_Profile:ProfileID': number;
  'ICC_Profile:ProfileVersion': string;
  'ICC_Profile:RedMatrixColumn': string;
  'ICC_Profile:RedTRC': string;
  'ICC_Profile:RenderingIntent': string;
  'ICC_Profile:ViewingCondDesc': string;
  'ICC_Profile:MeasurementGeometry': string;
  'ICC_Profile:DeviceModelDesc': string;
  'ICC_Profile:MeasurementIlluminant': string;
  'ICC_Profile:MeasurementFlare': string;
  'ICC_Profile:Luminance': string;
  'ICC_Profile:MeasurementBacking': string;
  'ICC_Profile:DeviceMfgDesc': string;
  'ICC_Profile:ViewingCondIlluminantType': string;
  'ICC_Profile:ViewingCondSurround': string;
  'ICC_Profile:ViewingCondIlluminant': string;
  'ICC_Profile:MeasurementObserver': string;
  'ICC_Profile:Technology': string;
}
export interface Photoshop {
  'Photoshop:IPTCDigest': string;
  'Photoshop:PhotoshopThumbnail': string;
  'Photoshop:DisplayedUnitsY': string;
  'Photoshop:PhotoshopQuality': number;
  'Photoshop:URL': string;
  'Photoshop:PhotoshopFormat': string;
  'Photoshop:ProgressiveScans': string;
  'Photoshop:GlobalAltitude': number;
  'Photoshop:GlobalAngle': number;
  'Photoshop:YResolution': number;
  'Photoshop:DisplayedUnitsX': string;
  'Photoshop:XResolution': number;
}

export interface EXIF {
  'EXIF:ApertureValue': number;
  'EXIF:Artist': string;
  'EXIF:BitsPerSample': string;
  'EXIF:ColorSpace': string;
  'EXIF:Compression': string;
  'EXIF:Copyright': string;
  'EXIF:Contrast': string;
  'EXIF:CreateDate': string;
  'EXIF:CustomRendered': string;
  'EXIF:DateTimeOriginal': string;
  'EXIF:ExifVersion': string;
  'EXIF:ExposureCompensation': number;
  'EXIF:ExposureMode': string;
  'EXIF:ExposureProgram': string;
  'EXIF:ExposureTime': string;
  'EXIF:FNumber': number;
  'EXIF:Flash': string;
  'EXIF:FocalLength': string;
  'EXIF:FocalPlaneResolutionUnit': string;
  'EXIF:FocalPlaneYResolution': string;
  'EXIF:GainControl': string;
  'EXIF:ISO': string;
  'EXIF:ImageDescription': string;
  'EXIF:ImageHeight': string;
  'EXIF:ImageWidth': string;
  'EXIF:LensInfo': string;
  'EXIF:LensModel': string;
  'EXIF:Make': string;
  'EXIF:MaxApertureValue': number;
  'EXIF:MeteringMode': string;
  'EXIF:Model': string;
  'EXIF:ModifyDate': string;
  'EXIF:Orientation': string;
  'EXIF:PhotometricInterpretation': string;
  'EXIF:PlanarConfiguration': string;
  'EXIF:Predictor': string;
  'EXIF:ResolutionUnit': string;
  'EXIF:RowsPerStrip': string;
  'EXIF:SamplesPerPixel': string;
  'EXIF:SerialNumber': string;
  'EXIF:ShutterSpeedValue': string;
  'EXIF:Software': string;
  'EXIF:StripByteCounts': string;
  'EXIF:StripOffsets': string;
  'EXIF:SubfileType': string;
  'EXIF:WhiteBalance': string;
  'EXIF:XResolution': number;
  'EXIF:YResolution': number;
  'ExifTool:ExifToolVersion': number;
  'EXIF:ExifImageHeight': number;
  'EXIF:FlashpixVersion': string;
  'EXIF:CompressedBitsPerPixel': number;
  'EXIF:SceneType': string;
  'EXIF:InteropIndex': string;
  'EXIF:SubjectDistanceRange': string;
  'EXIF:Saturation': string;
  'EXIF:InteropVersion': string;
  'EXIF:SensingMethod': string;
  'EXIF:FocalLengthIn35mmFormat': string;
  'EXIF:YCbCrPositioning': string;
  'EXIF:ComponentsConfiguration': string;
  'EXIF:FileSource': string;
  'EXIF:CFAPattern': string;
  'EXIF:ExifImageWidth': number;
  'EXIF:SceneCaptureType': string;
  'EXIF:DigitalZoomRatio': number;
  'EXIF:ThumbnailLength': number;
  'EXIF:LightSource': string;
  'EXIF:ThumbnailOffset': number;
  'EXIF:Sharpness': string;
}
export interface Composite {
  'Composite:Aperture': number;
  'Composite:CircleOfConfusion': string;
  'Composite:DigitalCreationDateTime': string;
  'Composite:FOV': string;
  'Composite:Flash': string;
  'Composite:FocalLength35efl': string;
  'Composite:HyperfocalDistance': string;
  'Composite:ImageSize': string;
  'Composite:LensID': string;
  'Composite:LightValue': number;
  'Composite:ScaleFactor35efl': number;
  'Composite:ShutterSpeed': string;
  'Composite:ThumbnailImage': string;
  'Composite:Megapixels': number;
  'Composite:DateTimeCreated': string;
}

export interface File {
  'File:BitsPerSample': number;
  'File:CurrentIPTCDigest': string;
  'File:ExifByteOrder': string;
  'File:FileAccessDate': string;
  'File:FileInodeChangeDate': string;
  'File:FileModifyDate': string;
  'File:FileName': string;
  'File:FilePermissions': string;
  'File:FileSize': string;
  'File:FileType': string;
  'File:MIMEType': string;
  'File:EncodingProcess': string;
  'File:ColorComponents': number;
  'File:ImageHeight': number;
  'File:FileTypeExtension': string;
  'File:YCbCrSubSampling': string;
  'File:ImageWidth': number;
}

export interface JFIF {
  'JFIF:YResolution': number;
  'JFIF:ResolutionUnit': string;
  'JFIF:XResolution': number;
  'JFIF:JFIFVersion': number;
}

export interface Misc {
  'APP14:APP14Flags1': string;
  SourceFile: string;
  'APP14:ColorTransform': string;
  'APP14:DCTEncodeVersion': number;
  'APP14:APP14Flags0': string;
}

export type Asset = Partial<XMP & IIC_Profile & File & AVAIL & IPTC & EXIF & Photoshop & Composite & JFIF & Misc>;
