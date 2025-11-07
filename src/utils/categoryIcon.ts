/**
 * 分类图标工具函数
 * 处理旧 emoji 格式和新图标库格式的兼容
 */

import {
  // 文件与文档
  FolderOutline,
  DocumentTextOutline,
  DocumentsOutline,
  ArchiveOutline,
  ClipboardOutline,
  // 技术与开发
  CodeOutline,
  TerminalOutline,
  GitBranchOutline,
  BugOutline,
  ServerOutline,
  CloudOutline,
  CloudDownloadOutline,
  CloudUploadOutline,
  // 设计与创意
  BrushOutline,
  ColorPaletteOutline,
  ImageOutline,
  ImagesOutline,
  CameraOutline,
  VideocamOutline,
  // 工具与设置
  ConstructOutline,
  SettingsOutline,
  HammerOutline,
  BuildOutline,
  ExtensionPuzzleOutline,
  // 学习与教育
  BookOutline,
  LibraryOutline,
  SchoolOutline,
  ReaderOutline,
  PencilOutline,
  // 商业与工作
  BriefcaseOutline,
  BusinessOutline,
  WalletOutline,
  CardOutline,
  CartOutline,
  StorefrontOutline,
  TrendingUpOutline,
  // 社交与通讯
  PeopleOutline,
  PersonOutline,
  ChatbubbleOutline,
  ChatbubblesOutline,
  MailOutline,
  CallOutline,
  ShareSocialOutline,
  // 娱乐与媒体
  GameControllerOutline,
  MusicalNotesOutline,
  TvOutline,
  FilmOutline,
  MicOutline,
  HeadsetOutline,
  // 生活与健康
  HomeOutline,
  CafeOutline,
  FastFoodOutline,
  RestaurantOutline,
  PizzaOutline,
  BarbellOutline,
  MedkitOutline,
  FitnessOutline,
  // 旅行与交通
  AirplaneOutline,
  CarOutline,
  BicycleOutline,
  TrainOutline,
  BoatOutline,
  MapOutline,
  CompassOutline,
  LocationOutline,
  // 自然与动物
  PawOutline,
  LeafOutline,
  FlowerOutline,
  SunnyOutline,
  MoonOutline,
  RainyOutline,
  // 符号与标记
  StarOutline,
  HeartOutline,
  BulbOutline,
  RocketOutline,
  TrophyOutline,
  GiftOutline,
  FlameOutline,
  FlashOutline,
  // 网络与全球
  GlobeOutline,
  LinkOutline,
  WifiOutline,
  BluetoothOutline,
  // 新闻与信息
  NewspaperOutline,
  MegaphoneOutline,
  NotificationsOutline,
  RadioOutline,
  // 科学与数学
  CalculatorOutline,
  StatsChartOutline,
  PieChartOutline,
  BarChartOutline,
  GridOutline,
  // 安全与隐私
  LockClosedOutline,
  KeyOutline,
  ShieldCheckmarkOutline,
  EyeOffOutline,
  // 时间与日历
  TimeOutline,
  CalendarOutline,
  AlarmOutline,
  HourglassOutline,
  // 其他常用
  SearchOutline,
  BookmarkOutline,
  DownloadOutline,
  ShareOutline,
  PrintOutline
} from '@vicons/ionicons5'
import type { Component } from 'vue'

// 图标映射表
const iconComponentMap: Record<string, Component> = {
  // 文件与文档 (5)
  'icon:FolderOutline': FolderOutline,
  'icon:DocumentTextOutline': DocumentTextOutline,
  'icon:DocumentsOutline': DocumentsOutline,
  'icon:ArchiveOutline': ArchiveOutline,
  'icon:ClipboardOutline': ClipboardOutline,

  // 技术与开发 (8)
  'icon:CodeOutline': CodeOutline,
  'icon:TerminalOutline': TerminalOutline,
  'icon:GitBranchOutline': GitBranchOutline,
  'icon:BugOutline': BugOutline,
  'icon:ServerOutline': ServerOutline,
  'icon:CloudOutline': CloudOutline,
  'icon:CloudDownloadOutline': CloudDownloadOutline,
  'icon:CloudUploadOutline': CloudUploadOutline,

  // 设计与创意 (6)
  'icon:BrushOutline': BrushOutline,
  'icon:ColorPaletteOutline': ColorPaletteOutline,
  'icon:ImageOutline': ImageOutline,
  'icon:ImagesOutline': ImagesOutline,
  'icon:CameraOutline': CameraOutline,
  'icon:VideocamOutline': VideocamOutline,

  // 工具与设置 (5)
  'icon:ConstructOutline': ConstructOutline,
  'icon:SettingsOutline': SettingsOutline,
  'icon:HammerOutline': HammerOutline,
  'icon:BuildOutline': BuildOutline,
  'icon:ExtensionPuzzleOutline': ExtensionPuzzleOutline,

  // 学习与教育 (5)
  'icon:BookOutline': BookOutline,
  'icon:LibraryOutline': LibraryOutline,
  'icon:SchoolOutline': SchoolOutline,
  'icon:ReaderOutline': ReaderOutline,
  'icon:PencilOutline': PencilOutline,

  // 商业与工作 (7)
  'icon:BriefcaseOutline': BriefcaseOutline,
  'icon:BusinessOutline': BusinessOutline,
  'icon:WalletOutline': WalletOutline,
  'icon:CardOutline': CardOutline,
  'icon:CartOutline': CartOutline,
  'icon:StorefrontOutline': StorefrontOutline,
  'icon:TrendingUpOutline': TrendingUpOutline,

  // 社交与通讯 (7)
  'icon:PeopleOutline': PeopleOutline,
  'icon:PersonOutline': PersonOutline,
  'icon:ChatbubbleOutline': ChatbubbleOutline,
  'icon:ChatbubblesOutline': ChatbubblesOutline,
  'icon:MailOutline': MailOutline,
  'icon:CallOutline': CallOutline,
  'icon:ShareSocialOutline': ShareSocialOutline,

  // 娱乐与媒体 (6)
  'icon:GameControllerOutline': GameControllerOutline,
  'icon:MusicalNotesOutline': MusicalNotesOutline,
  'icon:TvOutline': TvOutline,
  'icon:FilmOutline': FilmOutline,
  'icon:MicOutline': MicOutline,
  'icon:HeadsetOutline': HeadsetOutline,

  // 生活与健康 (8)
  'icon:HomeOutline': HomeOutline,
  'icon:CafeOutline': CafeOutline,
  'icon:FastFoodOutline': FastFoodOutline,
  'icon:RestaurantOutline': RestaurantOutline,
  'icon:PizzaOutline': PizzaOutline,
  'icon:BarbellOutline': BarbellOutline,
  'icon:MedkitOutline': MedkitOutline,
  'icon:FitnessOutline': FitnessOutline,

  // 旅行与交通 (8)
  'icon:AirplaneOutline': AirplaneOutline,
  'icon:CarOutline': CarOutline,
  'icon:BicycleOutline': BicycleOutline,
  'icon:TrainOutline': TrainOutline,
  'icon:BoatOutline': BoatOutline,
  'icon:MapOutline': MapOutline,
  'icon:CompassOutline': CompassOutline,
  'icon:LocationOutline': LocationOutline,

  // 自然与动物 (6)
  'icon:PawOutline': PawOutline,
  'icon:LeafOutline': LeafOutline,
  'icon:FlowerOutline': FlowerOutline,
  'icon:SunnyOutline': SunnyOutline,
  'icon:MoonOutline': MoonOutline,
  'icon:RainyOutline': RainyOutline,

  // 符号与标记 (8)
  'icon:StarOutline': StarOutline,
  'icon:HeartOutline': HeartOutline,
  'icon:BulbOutline': BulbOutline,
  'icon:RocketOutline': RocketOutline,
  'icon:TrophyOutline': TrophyOutline,
  'icon:GiftOutline': GiftOutline,
  'icon:FlameOutline': FlameOutline,
  'icon:FlashOutline': FlashOutline,

  // 网络与全球 (4)
  'icon:GlobeOutline': GlobeOutline,
  'icon:LinkOutline': LinkOutline,
  'icon:WifiOutline': WifiOutline,
  'icon:BluetoothOutline': BluetoothOutline,

  // 新闻与信息 (4)
  'icon:NewspaperOutline': NewspaperOutline,
  'icon:MegaphoneOutline': MegaphoneOutline,
  'icon:NotificationsOutline': NotificationsOutline,
  'icon:RadioOutline': RadioOutline,

  // 科学与数学 (5)
  'icon:CalculatorOutline': CalculatorOutline,
  'icon:StatsChartOutline': StatsChartOutline,
  'icon:PieChartOutline': PieChartOutline,
  'icon:BarChartOutline': BarChartOutline,
  'icon:GridOutline': GridOutline,

  // 安全与隐私 (4)
  'icon:LockClosedOutline': LockClosedOutline,
  'icon:KeyOutline': KeyOutline,
  'icon:ShieldCheckmarkOutline': ShieldCheckmarkOutline,
  'icon:EyeOffOutline': EyeOffOutline,

  // 时间与日历 (4)
  'icon:TimeOutline': TimeOutline,
  'icon:CalendarOutline': CalendarOutline,
  'icon:AlarmOutline': AlarmOutline,
  'icon:HourglassOutline': HourglassOutline,

  // 其他常用 (5)
  'icon:SearchOutline': SearchOutline,
  'icon:BookmarkOutline': BookmarkOutline,
  'icon:DownloadOutline': DownloadOutline,
  'icon:ShareOutline': ShareOutline,
  'icon:PrintOutline': PrintOutline
}

/**
 * 判断图标是否为新格式 (icon: 前缀)
 */
export function isIconLibraryFormat(icon?: string): boolean {
  return Boolean(icon && icon.startsWith('icon:'))
}

/**
 * 获取图标组件 (新格式)
 */
export function getIconComponent(icon?: string): Component | null {
  if (!icon || !isIconLibraryFormat(icon)) {
    return null
  }
  return iconComponentMap[icon] || null
}

/**
 * 判断是否为 emoji 格式 (旧格式)
 */
export function isEmojiFormat(icon?: string): boolean {
  return Boolean(icon && !isIconLibraryFormat(icon))
}

/**
 * 获取默认图标
 */
export function getDefaultIcon(): string {
  return 'icon:FolderOutline'
}
