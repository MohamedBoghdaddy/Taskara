/**
 * Centralized icon library — FontAwesome React.
 * Import: import { TaskIcon, NoteIcon } from './Icons';
 * All icons accept standard FontAwesomeIcon props: size, color, className, style, title.
 */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  faHome, faCalendarAlt, faBell, faSearch, faCog,
  faPlus, faEdit, faTrashAlt, faCheck, faTimes, faChevronLeft,
  faChevronRight, faChevronDown, faChevronUp, faBars, faMoon, faSun,
  faSignOutAlt, faEllipsisH, faEllipsisV, faEyeSlash,
  faLock, faStar, faFire, faRocket, faBolt,
  faBrain, faLightbulb, faComment, faComments, faTag, faTags,
  faFolder, faFolderOpen, faFileAlt,
  faVideo, faMusic, faMicrophone, faPaperclip, faLink,
  faExternalLinkAlt, faUndo, faRedo, faBold, faItalic,
  faUnderline, faStrikethrough, faListUl, faListOl, faQuoteLeft,
  faCode, faTable, faColumns, faAlignLeft, faAlignCenter, faAlignRight,
  faSave, faDownload, faShareAlt,
  faFilter, faSort, faArrowLeft, faArrowRight,
  faArrowUp, faArrowDown, faSync, faSpinner, faCircleNotch,
  faExclamationTriangle, faExclamationCircle, faInfoCircle, faCheckCircle,
  faClock, faStopwatch, faPlay, faPause, faStop, faVolumeUp, faVolumeMute,
  faUsers, faUserPlus, faUserCheck, faUserCog, faCrown,
  faChartBar, faChartLine, faChartPie, faChartArea,
  faProjectDiagram, faSitemap, faCodeBranch,
  faInbox, faPaperPlane, faHashtag, faAt,
  faLayerGroup, faObjectGroup, faDrawPolygon, faMagic, faRobot,
  faPalette, faGlobe, faWifi, faCloud, faCloudUploadAlt,
  faDatabase, faServer,
  faCalendarCheck, faCalendarPlus,
  faAngleLeft, faAngleRight, faAngleDown, faAngleUp,
  faAngleDoubleLeft, faAngleDoubleRight,
  faGripVertical, faGripHorizontal,
  faThLarge, faTh, faThList,
  faHeading, faStickyNote, faBookmark, faBookOpen,
  faTrophy, faMedal, faRunning, faCoffee, faMapPin, faFlag,
  faKey, faToggleOn, faToggleOff, faSlidersH,
  faThumbsUp, faStream, faNetworkWired, faTachometerAlt,
  faCubes, faCube, faBox, faBoxOpen,
  faClipboardList, faClipboardCheck, faExchangeAlt,
  faLevelDownAlt, faDotCircle, faCheckSquare,
  faRoad,
  faUserMinus, faShieldAlt,
  faPrint,
  faUserShield,
  faStepForward,
  faHourglassHalf,
  faRecycle,
  faListAlt,
  faSortUp, faSortDown,
  faSignal,
  faBroadcastTower,
  faClone,
  faHistory,
  faLevelUpAlt,
  faCogs,
  faMeh,
  faFrown,
  faGem,
  faWrench,
  faBug,
  faTools,
  faNotesMedical,
  faFileImport,
  faFileExport,
  faCompressAlt,
  faExpandAlt,
  faCommentAlt,
  faCaretDown,
  faCaretUp,
  faHandshake,
  faBalanceScale,
  faHdd,
  faMemory,
  faDesktop,
  faMobile,
  faPuzzlePiece,
  faPlug,
  faQrcode,
} from '@fortawesome/free-solid-svg-icons';

import {
  faStar as faStarR,
  faBookmark as faBookmarkR,
  faClock as faClockR,
  faComment as faCommentR,
  faEnvelope as faEnvelopeR,
  faEye as faEyeR,
  faFile as faFileR,
  faFolder as faFolderR,
  faImage as faImageR,
  faSmile as faSmileR,
  faBell as faBellR,
  faCalendarAlt as faCalendarR,
  faCheckSquare as faCheckSquareR,
  faUser as faUserR,
  faLightbulb as faLightbulbR,
  faCopy as faCopyR,
  faStickyNote as faStickyNoteR,
  faGem as faGemR,
  faFlag as faFlagR,
} from '@fortawesome/free-regular-svg-icons';

import {
  faGithub, faGoogle, faSlack, faDiscord, faTwitter, faLinkedin,
} from '@fortawesome/free-brands-svg-icons';

const I = (icon, defaults = {}) => {
  const Comp = ({ size = '1x', color, className = '', style = {}, title, ...rest }) => (
    <FontAwesomeIcon icon={icon} size={size} color={color} className={className} style={{ ...defaults.style, ...style }} title={title} {...defaults} {...rest} />
  );
  Comp.displayName = `Icon(${icon.iconName})`;
  return Comp;
};

// ── Navigation ───────────────────────────────────────────────────────────────
export const HomeIcon         = I(faHome);
export const TodayIcon        = I(faCalendarCheck);
export const InboxIcon        = I(faInbox);
export const SearchIcon       = I(faSearch);
export const SettingsIcon     = I(faCog);
export const SettingsAltIcon  = I(faCogs);
export const MenuIcon         = I(faBars);
export const CollapseIcon     = I(faAngleDoubleLeft);
export const ExpandSideIcon   = I(faAngleDoubleRight);

// ── CRUD ─────────────────────────────────────────────────────────────────────
export const AddIcon          = I(faPlus);
export const EditIcon         = I(faEdit);
export const DeleteIcon       = I(faTrashAlt);
export const SaveIcon         = I(faSave);
export const CopyIcon         = I(faCopyR);
export const CloneIcon        = I(faClone);
export const MoveIcon         = I(faGripVertical);
export const DragIcon         = I(faGripHorizontal);
export const ArchiveIcon      = I(faBox);
export const RestoreIcon      = I(faBoxOpen);
export const HistoryIcon      = I(faHistory);

// ── Status ───────────────────────────────────────────────────────────────────
export const CheckIcon        = I(faCheck);
export const CloseIcon        = I(faTimes);
export const CheckCircleIcon  = I(faCheckCircle);
export const ErrorIcon        = I(faExclamationCircle);
export const WarnIcon         = I(faExclamationTriangle);
export const InfoIcon         = I(faInfoCircle);
export const SpinnerIcon      = I(faSpinner, { spin: true });
export const LoadingIcon      = I(faCircleNotch, { spin: true });

// ── Directional ──────────────────────────────────────────────────────────────
export const ChevronLeft      = I(faChevronLeft);
export const ChevronRight     = I(faChevronRight);
export const ChevronDown      = I(faChevronDown);
export const ChevronUp        = I(faChevronUp);
export const ArrowLeft        = I(faArrowLeft);
export const ArrowRight       = I(faArrowRight);
export const ArrowUp          = I(faArrowUp);
export const ArrowDown        = I(faArrowDown);
export const AngleLeft        = I(faAngleLeft);
export const AngleRight       = I(faAngleRight);
export const AngleDown        = I(faAngleDown);
export const AngleUp          = I(faAngleUp);
export const CaretDown        = I(faCaretDown);
export const CaretUp          = I(faCaretUp);
export const LevelDown        = I(faLevelDownAlt);
export const LevelUp          = I(faLevelUpAlt);

// ── Theme ────────────────────────────────────────────────────────────────────
export const SunIcon          = I(faSun);
export const MoonIcon         = I(faMoon);

// ── User / Auth ───────────────────────────────────────────────────────────────
export const UserIcon         = I(faUserR);
export const UsersIcon        = I(faUsers);
export const UserPlusIcon     = I(faUserPlus);
export const UserMinusIcon    = I(faUserMinus);
export const UserCheckIcon    = I(faUserCheck);
export const UserCogIcon      = I(faUserCog);
export const UserShieldIcon   = I(faUserShield);
export const LogoutIcon       = I(faSignOutAlt);
export const LockIcon         = I(faLock);
export const KeyIcon          = I(faKey);
export const CrownIcon        = I(faCrown);
export const ShieldIcon       = I(faShieldAlt);
export const HandshakeIcon    = I(faHandshake);

// ── Notes ────────────────────────────────────────────────────────────────────
export const NoteIcon         = I(faStickyNoteR);
export const NoteFilledIcon   = I(faStickyNote);
export const BookIcon         = I(faBookOpen);
export const PageIcon         = I(faFileAlt);
export const BacklinkIcon     = I(faLink);
export const ExternalLinkIcon = I(faExternalLinkAlt);
export const TagIcon          = I(faHashtag);
export const TagsIcon         = I(faTags);
export const PinIcon          = I(faMapPin);
export const BookmarkIcon     = I(faBookmarkR);
export const BookmarkFilledIcon = I(faBookmark);
export const MedicalIcon      = I(faNotesMedical);

// ── Tasks ────────────────────────────────────────────────────────────────────
export const TaskIcon         = I(faClipboardList);
export const ChecklistIcon    = I(faClipboardCheck);
export const SubtaskIcon      = I(faLevelDownAlt);
export const PriorityIcon     = I(faFlagR);
export const PriorityFilledIcon = I(faFlag);
export const DueDateIcon      = I(faCalendarAlt);
export const AssignIcon       = I(faUserCheck);
export const LabelIcon        = I(faTag);
export const CheckboxIcon     = I(faCheckSquareR);
export const CheckboxFilledIcon = I(faCheckSquare);

// ── Projects / Boards ────────────────────────────────────────────────────────
export const ProjectIcon      = I(faFolderR);
export const ProjectFilledIcon = I(faFolder);
export const ProjectOpenIcon  = I(faFolderOpen);
export const BoardIcon        = I(faThLarge);
export const KanbanIcon       = I(faColumns);
export const ListIcon         = I(faThList);
export const SprintIcon       = I(faRunning);
export const BacklogIcon      = I(faStream);
export const TimelineIcon     = I(faSitemap);
export const WorkflowIcon     = I(faProjectDiagram);
export const RoadmapIcon      = I(faRoad);
export const BranchIcon       = I(faCodeBranch);
export const LayersIcon       = I(faLayerGroup);
export const BlocksIcon       = I(faCubes);
export const BlockIcon        = I(faCube);
export const PuzzleIcon       = I(faPuzzlePiece);

// ── Pomodoro / Timer ─────────────────────────────────────────────────────────
export const TimerIcon        = I(faStopwatch);
export const ClockIcon        = I(faClockR);
export const ClockFilledIcon  = I(faClock);
export const PlayIcon         = I(faPlay);
export const PauseIcon        = I(faPause);
export const StopIcon         = I(faStop);
export const ResetIcon        = I(faSync);
export const SkipIcon         = I(faStepForward);
export const AlarmIcon        = I(faBellR);
export const AlarmFilledIcon  = I(faBell);
export const SoundIcon        = I(faVolumeUp);
export const MuteIcon         = I(faVolumeMute);
export const MusicIcon        = I(faMusic);
export const FocusIcon        = I(faBrain);
export const BreakIcon        = I(faCoffee);
export const FireIcon         = I(faFire);
export const StreakIcon       = I(faFire);
export const FlashIcon        = I(faBolt);
export const HourglassIcon    = I(faHourglassHalf);

// ── Analytics / Charts ───────────────────────────────────────────────────────
export const AnalyticsIcon    = I(faChartBar);
export const LineChartIcon    = I(faChartLine);
export const PieChartIcon     = I(faChartPie);
export const AreaChartIcon    = I(faChartArea);
export const TachometerIcon   = I(faTachometerAlt);
export const TrendUpIcon      = I(faArrowUp);
export const TrendDownIcon    = I(faArrowDown);
export const TrophyIcon       = I(faTrophy);
export const MedalIcon        = I(faMedal);
export const SignalIcon       = I(faSignal);

// ── Calendar / Time ──────────────────────────────────────────────────────────
export const CalendarIcon     = I(faCalendarR);
export const CalendarAddIcon  = I(faCalendarPlus);
export const CalendarCheckIcon = I(faCalendarCheck);
export const ReminderIcon     = I(faBellR);
export const ScheduleIcon     = I(faCalendarCheck);

// ── Graph / Knowledge ────────────────────────────────────────────────────────
export const GraphIcon        = I(faProjectDiagram);
export const NodeIcon         = I(faDotCircle);
export const ClusterIcon      = I(faObjectGroup);
export const NetworkIcon      = I(faNetworkWired);

// ── AI ───────────────────────────────────────────────────────────────────────
export const AIIcon           = I(faRobot);
export const SparkIcon        = I(faMagic);
export const BrainIcon        = I(faBrain);
export const LightbulbIcon    = I(faLightbulbR);
export const LightbulbFilledIcon = I(faLightbulb);
export const WandIcon         = I(faMagic);
export const BotIcon          = I(faRobot);
export const VoiceIcon        = I(faMicrophone);
export const IdeaIcon         = I(faLightbulb);

// ── Databases ────────────────────────────────────────────────────────────────
export const DatabaseIcon     = I(faDatabase);
export const TableIcon        = I(faTable);
export const GridIcon         = I(faThLarge);
export const GalleryIcon      = I(faTh);
export const ServerIcon       = I(faServer);

// ── Collaboration ────────────────────────────────────────────────────────────
export const CommentIcon      = I(faCommentR);
export const CommentFilledIcon = I(faComment);
export const CommentsIcon     = I(faComments);
export const CommentAltIcon   = I(faCommentAlt);
export const MentionIcon      = I(faAt);
export const TeamIcon         = I(faUserCog);
export const InviteIcon       = I(faEnvelopeR);
export const ShareIcon        = I(faShareAlt);
export const BroadcastIcon    = I(faBroadcastTower);

// ── Templates ────────────────────────────────────────────────────────────────
export const TemplateIcon     = I(faLayerGroup);
export const LayoutIcon       = I(faColumns);
export const BlueprintIcon    = I(faDrawPolygon);

// ── Files / Media ────────────────────────────────────────────────────────────
export const FileIcon         = I(faFileR);
export const ImageIcon        = I(faImageR);
export const VideoIcon        = I(faVideo);
export const AttachIcon       = I(faPaperclip);
export const UploadIcon       = I(faCloudUploadAlt);
export const DownloadIcon     = I(faDownload);
export const ExportIcon       = I(faFileExport);
export const ImportIcon       = I(faFileImport);
export const PrintIcon        = I(faPrint);
export const QrIcon           = I(faQrcode);

// ── Text Formatting ──────────────────────────────────────────────────────────
export const BoldIcon         = I(faBold);
export const ItalicIcon       = I(faItalic);
export const UnderlineIcon    = I(faUnderline);
export const StrikeIcon       = I(faStrikethrough);
export const CodeIcon         = I(faCode);
export const QuoteIcon        = I(faQuoteLeft);
export const HeadingIcon      = I(faHeading);
export const BulletIcon       = I(faListUl);
export const NumberedIcon     = I(faListOl);
export const UndoIcon         = I(faUndo);
export const RedoIcon         = I(faRedo);
export const AlignLeftIcon    = I(faAlignLeft);
export const AlignCenterIcon  = I(faAlignCenter);
export const AlignRightIcon   = I(faAlignRight);

// ── UI Controls ──────────────────────────────────────────────────────────────
export const FilterIcon       = I(faFilter);
export const SortIcon         = I(faSort);
export const SortUpIcon       = I(faSortUp);
export const SortDownIcon     = I(faSortDown);
export const MoreIcon         = I(faEllipsisH);
export const MoreVertIcon     = I(faEllipsisV);
export const FullscreenIcon   = I(faExpandAlt);
export const ExitFullIcon     = I(faCompressAlt);
export const ToggleOnIcon     = I(faToggleOn);
export const ToggleOffIcon    = I(faToggleOff);
export const SliderIcon       = I(faSlidersH);
export const EyeIcon          = I(faEyeR);
export const EyeOffIcon       = I(faEyeSlash);
export const RefreshIcon      = I(faSync);
export const ExchangeIcon     = I(faExchangeAlt);
export const PlugIcon         = I(faPlug);

// ── Brands ───────────────────────────────────────────────────────────────────
export const GitHubIcon       = I(faGithub);
export const GoogleIcon       = I(faGoogle);
export const SlackIcon        = I(faSlack);
export const DiscordIcon      = I(faDiscord);
export const TwitterIcon      = I(faTwitter);
export const LinkedInIcon     = I(faLinkedin);

// ── Misc ─────────────────────────────────────────────────────────────────────
export const StarIcon         = I(faStarR);
export const StarFilledIcon   = I(faStar);
export const RocketIcon       = I(faRocket);
export const GlobeIcon        = I(faGlobe);
export const HashIcon         = I(faHashtag);
export const SendIcon         = I(faPaperPlane);
export const EmailIcon        = I(faEnvelopeR);
export const BugIcon          = I(faBug);
export const WrenchIcon       = I(faWrench);
export const ToolsIcon        = I(faTools);
export const GemIcon          = I(faGemR);
export const GemFilledIcon    = I(faGem);
export const SmileyIcon       = I(faSmileR);
export const FrownIcon        = I(faFrown);
export const NeutralIcon      = I(faMeh);
export const ThumbUpIcon      = I(faThumbsUp);
export const CloudIcon        = I(faCloud);
export const WifiIcon         = I(faWifi);
export const MemoryIcon       = I(faMemory);
export const HddIcon          = I(faHdd);
export const DesktopIcon      = I(faDesktop);
export const MobileIcon       = I(faMobile);
export const ListAltIcon      = I(faListAlt);
export const RecycleIcon      = I(faRecycle);
export const BalanceIcon      = I(faBalanceScale);
export const PaletteIcon      = I(faPalette);

// ── Inline SVG Logo ───────────────────────────────────────────────────────────
export const LogoIcon = ({ size = 24, color = 'currentColor', style = {}, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...p}>
    <rect x="2" y="2" width="9" height="9" rx="2" fill={color} />
    <rect x="13" y="2" width="9" height="9" rx="2" fill={color} opacity="0.55" />
    <rect x="2" y="13" width="9" height="9" rx="2" fill={color} opacity="0.55" />
    <rect x="13" y="13" width="9" height="9" rx="2" fill={color} />
  </svg>
);
