const matroskaSpecXML = `<?xml version="1.0" encoding="utf-8"?>
<table>
    <element name="EBML" level="0" id="0x1A45DFA3" type="master" mandatory="1" multiple="1" minver="1">Set the EBML characteristics of the data to follow. Each EBML document has to start with this.</element>
    <element name="EBMLVersion" level="1" id="0x4286" type="uinteger" mandatory="1" default="1" minver="1">The version of EBML parser used to create the file.</element>
    <element name="EBMLReadVersion" level="1" id="0x42F7" type="uinteger" mandatory="1" default="1" minver="1">The minimum EBML version a parser has to support to read this file.</element>
    <element name="EBMLMaxIDLength" level="1" id="0x42F2" type="uinteger" mandatory="1" default="4" minver="1">The maximum length of the IDs you\'ll find in this file (4 or less in Matroska).</element>
    <element name="EBMLMaxSizeLength" level="1" id="0x42F3" type="uinteger" mandatory="1" default="8" minver="1">The maximum length of the sizes you\'ll find in this file (8 or less in Matroska). This does not override the element size indicated at the beginning of an element. Elements that have an indicated size which is larger than what is allowed by EBMLMaxSizeLength shall be considered invalid.</element>
    <element name="DocType" level="1" id="0x4282" type="string" mandatory="1" default="matroska" minver="1">A string that describes the type of document that follows this EBML header. \'matroska\' in our case or \'webm\' for webm files.</element>
    <element name="DocTypeVersion" level="1" id="0x4287" type="uinteger" mandatory="1" default="1" minver="1">The version of DocType interpreter used to create the file.</element>
    <element name="DocTypeReadVersion" level="1" id="0x4285" type="uinteger" mandatory="1" default="1" minver="1">The minimum DocType version an interpreter has to support to read this file.</element>
    <element name="Void" level="-1" id="0xEC" type="binary" minver="1">Used to void damaged data, to avoid unexpected behaviors when using damaged data. The content is discarded. Also used to reserve space in a sub-element for later use.</element>
    <element name="CRC-32" level="-1" id="0xBF" type="binary" minver="1" webm="0">The CRC is computed on all the data of the Master element it\'s in. The CRC element should be the first in it\'s parent master for easier reading. All level 1 elements should include a CRC-32. The CRC in use is the IEEE CRC32 Little Endian</element>
    <element name="SignatureSlot" level="-1" id="0x1B538667" type="master" multiple="1" webm="0">Contain signature of some (coming) elements in the stream.</element>
    <element name="SignatureAlgo" level="1" id="0x7E8A" type="uinteger" webm="0">Signature algorithm used (1=RSA, 2=elliptic).</element>
    <element name="SignatureHash" level="1" id="0x7E9A" type="uinteger" webm="0">Hash algorithm used (1=SHA1-160, 2=MD5).</element>
    <element name="SignaturePublicKey" level="1" id="0x7EA5" type="binary" webm="0">The public key to use with the algorithm (in the case of a PKI-based signature).</element>
    <element name="Signature" level="1" id="0x7EB5" type="binary" webm="0">The signature of the data (until a new.</element>
    <element name="SignatureElements" level="1" id="0x7E5B" type="master" webm="0">Contains elements that will be used to compute the signature.</element>
    <element name="SignatureElementList" level="2" id="0x7E7B" type="master" multiple="1" webm="0">A list consists of a number of consecutive elements that represent one case where data is used in signature. Ex: <i>Cluster|Block|BlockAdditional</i> means that the BlockAdditional of all Blocks in all Clusters is used for encryption.</element>
    <element name="SignedElement" level="3" id="0x6532" type="binary" multiple="1" webm="0">An element ID whose data will be used to compute the signature.</element>
    <element name="Segment" level="0" id="0x18538067" type="master" mandatory="1" multiple="1" minver="1">This element contains all other top-level (level 1) elements. Typically a Matroska file is composed of 1 segment.</element>
    <element name="SeekHead" cppname="SeekHeader" level="1" id="0x114D9B74" type="master" multiple="1" minver="1">Contains the <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of other level 1 elements.</element>
    <element name="Seek" cppname="SeekPoint" level="2" id="0x4DBB" type="master" mandatory="1" multiple="1" minver="1">Contains a single seek entry to an EBML element.</element>
    <element name="SeekID" level="3" id="0x53AB" type="ebmlid" mandatory="1" minver="1">The binary ID corresponding to the element name.</element>
    <element name="SeekPosition" level="3" id="0x53AC" type="uinteger" mandatory="1" minver="1">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of the element in the segment in octets (0 = first level 1 element).</element>
    <element name="Info" level="1" id="0x1549A966" type="master" mandatory="1" multiple="1" minver="1">Contains miscellaneous general information and statistics on the file.</element>
    <element name="SegmentUID" level="2" id="0x73A4" type="binary" minver="1" webm="0" range="not 0" bytesize="16">A randomly generated unique ID to identify the current segment between many others (128 bits).</element>
    <element name="SegmentFilename" level="2" id="0x7384" type="utf-8" minver="1" webm="0">A filename corresponding to this segment.</element>
    <element name="PrevUID" level="2" id="0x3CB923" type="binary" minver="1" webm="0" bytesize="16">A unique ID to identify the previous chained segment (128 bits).</element>
    <element name="PrevFilename" level="2" id="0x3C83AB" type="utf-8" minver="1" webm="0">An escaped filename corresponding to the previous segment.</element>
    <element name="NextUID" level="2" id="0x3EB923" type="binary" minver="1" webm="0" bytesize="16">A unique ID to identify the next chained segment (128 bits).</element>
    <element name="NextFilename" level="2" id="0x3E83BB" type="utf-8" minver="1" webm="0">An escaped filename corresponding to the next segment.</element>
    <element name="SegmentFamily" level="2" id="0x4444" type="binary" multiple="1" minver="1" webm="0" bytesize="16">A randomly generated unique ID that all segments related to each other must use (128 bits).</element>
    <element name="ChapterTranslate" level="2" id="0x6924" type="master" multiple="1" minver="1" webm="0">A tuple of corresponding ID used by chapter codecs to represent this segment.</element>
    <element name="ChapterTranslateEditionUID" level="3" id="0x69FC" type="uinteger" multiple="1" minver="1" webm="0">Specify an edition UID on which this correspondance applies. When not specified, it means for all editions found in the segment.</element>
    <element name="ChapterTranslateCodec" level="3" id="0x69BF" type="uinteger" mandatory="1" minver="1" webm="0">The <a href="http://www.matroska.org/technical/specs/index.html#ChapProcessCodecID">chapter codec</a> using this ID (0: Matroska Script, 1: DVD-menu).</element>
    <element name="ChapterTranslateID" level="3" id="0x69A5" type="binary" mandatory="1" minver="1" webm="0">The binary value used to represent this segment in the chapter codec data. The format depends on the <a href="http://www.matroska.org/technical/specs/chapters/index.html#ChapProcessCodecID">ChapProcessCodecID</a> used.</element>
    <element name="TimecodeScale" level="2" id="0x2AD7B1" type="uinteger" mandatory="1" minver="1" default="1000000">Timecode scale in nanoseconds (1.000.000 means all timecodes in the segment are expressed in milliseconds).</element>
    <element name="Duration" level="2" id="0x4489" type="float" minver="1" range="&gt; 0">Duration of the segment (based on TimecodeScale).</element>
    <element name="DateUTC" level="2" id="0x4461" type="date" minver="1">Date of the origin of timecode (value 0), i.e. production date.</element>
    <element name="Title" level="2" id="0x7BA9" type="utf-8" minver="1" webm="0">General name of the segment.</element>
    <element name="MuxingApp" level="2" id="0x4D80" type="utf-8" mandatory="1" minver="1">Muxing application or library ("libmatroska-0.4.3").</element>
    <element name="WritingApp" level="2" id="0x5741" type="utf-8" mandatory="1" minver="1">Writing application ("mkvmerge-0.3.3").</element>
    <element name="Cluster" level="1" id="0x1F43B675" type="master" multiple="1" minver="1">The lower level element containing the (monolithic) Block structure.</element>
    <element name="Timecode" cppname="ClusterTimecode" level="2" id="0xE7" type="uinteger" mandatory="1" minver="1">Absolute timecode of the cluster (based on TimecodeScale).</element>
    <element name="SilentTracks" cppname="ClusterSilentTracks" level="2" id="0x5854" type="master" minver="1" webm="0">The list of tracks that are not used in that part of the stream. It is useful when using overlay tracks on seeking. Then you should decide what track to use.</element>
    <element name="SilentTrackNumber" cppname="ClusterSilentTrackNumber" level="3" id="0x58D7" type="uinteger" multiple="1" minver="1" webm="0">One of the track number that are not used from now on in the stream. It could change later if not specified as silent in a further Cluster.</element>
    <element name="Position" cppname="ClusterPosition" level="2" id="0xA7" type="uinteger" minver="1" webm="0">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">Position</a> of the Cluster in the segment (0 in live broadcast streams). It might help to resynchronise offset on damaged streams.</element>
    <element name="PrevSize" cppname="ClusterPrevSize" level="2" id="0xAB" type="uinteger" minver="1">Size of the previous Cluster, in octets. Can be useful for backward playing.</element>
    <element name="SimpleBlock" level="2" id="0xA3" type="binary" multiple="1" minver="2" webm="1" divx="1">Similar to <a href="http://www.matroska.org/technical/specs/index.html#Block">Block</a> but without all the extra information, mostly used to reduced overhead when no extra feature is needed. (see <a href="http://www.matroska.org/technical/specs/index.html#simpleblock_structure">SimpleBlock Structure</a>)</element>
    <element name="BlockGroup" level="2" id="0xA0" type="master" multiple="1" minver="1">Basic container of information containing a single Block or BlockVirtual, and information specific to that Block/VirtualBlock.</element>
    <element name="Block" level="3" id="0xA1" type="binary" mandatory="1" minver="1">Block containing the actual data to be rendered and a timecode relative to the Cluster Timecode. (see <a href="http://www.matroska.org/technical/specs/index.html#block_structure">Block Structure</a>)</element>
    <element name="BlockVirtual" level="3" id="0xA2" type="binary" webm="0">A Block with no data. It must be stored in the stream at the place the real Block should be in display order. (see <a href="http://www.matroska.org/technical/specs/index.html#block_virtual">Block Virtual</a>)</element>
    <element name="BlockAdditions" level="3" id="0x75A1" type="master" minver="1" webm="0">Contain additional blocks to complete the main one. An EBML parser that has no knowledge of the Block structure could still see and use/skip these data.</element>
    <element name="BlockMore" level="4" id="0xA6" type="master" mandatory="1" multiple="1" minver="1" webm="0">Contain the BlockAdditional and some parameters.</element>
    <element name="BlockAddID" level="5" id="0xEE" type="uinteger" mandatory="1" minver="1" webm="0" default="1" range="not 0">An ID to identify the BlockAdditional level.</element>
    <element name="BlockAdditional" level="5" id="0xA5" type="binary" mandatory="1" minver="1" webm="0">Interpreted by the codec as it wishes (using the BlockAddID).</element>
    <element name="BlockDuration" level="3" id="0x9B" type="uinteger" minver="1" default="TrackDuration">The duration of the Block (based on TimecodeScale). This element is mandatory when DefaultDuration is set for the track (but can be omitted as other default values). When not written and with no DefaultDuration, the value is assumed to be the difference between the timecode of this Block and the timecode of the next Block in "display" order (not coding order). This element can be useful at the end of a Track (as there is not other Block available), or when there is a break in a track like for subtitle tracks. When set to 0 that means the frame is not a keyframe.</element>
    <element name="ReferencePriority" cppname="FlagReferenced" level="3" id="0xFA" type="uinteger" mandatory="1" minver="1" webm="0" default="0">This frame is referenced and has the specified cache priority. In cache only a frame of the same or higher priority can replace this frame. A value of 0 means the frame is not referenced.</element>
    <element name="ReferenceBlock" level="3" id="0xFB" type="integer" multiple="1" minver="1">Timecode of another frame used as a reference (ie: B or P frame). The timecode is relative to the block it\'s attached to.</element>
    <element name="ReferenceVirtual" level="3" id="0xFD" type="integer" webm="0">Relative <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of the data that should be in position of the virtual block.</element>
    <element name="CodecState" level="3" id="0xA4" type="binary" minver="2" webm="0">The new codec state to use. Data interpretation is private to the codec. This information should always be referenced by a seek entry.</element>
    <element name="Slices" level="3" id="0x8E" type="master" minver="1" divx="0">Contains slices description.</element>
    <element name="TimeSlice" level="4" id="0xE8" type="master" multiple="1" minver="1" divx="0">Contains extra time information about the data contained in the Block. While there are a few files in the wild with this element, it is no longer in use and has been deprecated. Being able to interpret this element is not required for playback.</element>
    <element name="LaceNumber" cppname="SliceLaceNumber" level="5" id="0xCC" type="uinteger" minver="1" default="0" divx="0">The reverse number of the frame in the lace (0 is the last frame, 1 is the next to last, etc). While there are a few files in the wild with this element, it is no longer in use and has been deprecated. Being able to interpret this element is not required for playback.</element>
    <element name="FrameNumber" cppname="SliceFrameNumber" level="5" id="0xCD" type="uinteger" default="0">The number of the frame to generate from this lace with this delay (allow you to generate many frames from the same Block/Frame).</element>
    <element name="BlockAdditionID" cppname="SliceBlockAddID" level="5" id="0xCB" type="uinteger" default="0">The ID of the BlockAdditional element (0 is the main Block).</element>
    <element name="Delay" cppname="SliceDelay" level="5" id="0xCE" type="uinteger" default="0">The (scaled) delay to apply to the element.</element>
    <element name="SliceDuration" level="5" id="0xCF" type="uinteger" default="0">The (scaled) duration to apply to the element.</element>
    <element name="ReferenceFrame" level="3" id="0xC8" type="master" multiple="0" minver="0" webm="0" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="ReferenceOffset" level="4" id="0xC9" type="uinteger" multiple="0" mandatory="1" minver="0" webm="0" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="ReferenceTimeCode" level="4" id="0xCA" type="uinteger" multiple="0" mandatory="1" minver="0" webm="0" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="EncryptedBlock" level="2" id="0xAF" type="binary" multiple="1" webm="0">Similar to <a href="http://www.matroska.org/technical/specs/index.html#SimpleBlock">SimpleBlock</a> but the data inside the Block are Transformed (encrypt and/or signed). (see <a href="http://www.matroska.org/technical/specs/index.html#encryptedblock_structure">EncryptedBlock Structure</a>)</element>
    <element name="Tracks" level="1" id="0x1654AE6B" type="master" multiple="1" minver="1">A top-level block of information with many tracks described.</element>
    <element name="TrackEntry" level="2" id="0xAE" type="master" mandatory="1" multiple="1" minver="1">Describes a track with all elements.</element>
    <element name="TrackNumber" level="3" id="0xD7" type="uinteger" mandatory="1" minver="1" range="not 0">The track number as used in the Block Header (using more than 127 tracks is not encouraged, though the design allows an unlimited number).</element>
    <element name="TrackUID" level="3" id="0x73C5" type="uinteger" mandatory="1" minver="1" range="not 0">A unique ID to identify the Track. This should be kept the same when making a direct stream copy of the Track to another file.</element>
    <element name="TrackType" level="3" id="0x83" type="uinteger" mandatory="1" minver="1" range="1-254">A set of track types coded on 8 bits (1: video, 2: audio, 3: complex, 0x10: logo, 0x11: subtitle, 0x12: buttons, 0x20: control).</element>
    <element name="FlagEnabled" cppname="TrackFlagEnabled" level="3" id="0xB9" type="uinteger" mandatory="1" minver="2" webm="1" default="1" range="0-1">Set if the track is usable. (1 bit)</element>
    <element name="FlagDefault" cppname="TrackFlagDefault" level="3" id="0x88" type="uinteger" mandatory="1" minver="1" default="1" range="0-1">Set if that track (audio, video or subs) SHOULD be active if no language found matches the user preference. (1 bit)</element>
    <element name="FlagForced" cppname="TrackFlagForced" level="3" id="0x55AA" type="uinteger" mandatory="1" minver="1" default="0" range="0-1">Set if that track MUST be active during playback. There can be many forced track for a kind (audio, video or subs), the player should select the one which language matches the user preference or the default + forced track. Overlay MAY happen between a forced and non-forced track of the same kind. (1 bit)</element>
    <element name="FlagLacing" cppname="TrackFlagLacing" level="3" id="0x9C" type="uinteger" mandatory="1" minver="1" default="1" range="0-1">Set if the track may contain blocks using lacing. (1 bit)</element>
    <element name="MinCache" cppname="TrackMinCache" level="3" id="0x6DE7" type="uinteger" mandatory="1" minver="1" webm="0" default="0">The minimum number of frames a player should be able to cache during playback. If set to 0, the reference pseudo-cache system is not used.</element>
    <element name="MaxCache" cppname="TrackMaxCache" level="3" id="0x6DF8" type="uinteger" minver="1" webm="0">The maximum cache size required to store referenced frames in and the current frame. 0 means no cache is needed.</element>
    <element name="DefaultDuration" cppname="TrackDefaultDuration" level="3" id="0x23E383" type="uinteger" minver="1" range="not 0">Number of nanoseconds (not scaled via TimecodeScale) per frame (\'frame\' in the Matroska sense -- one element put into a (Simple)Block).</element>
    <element name="TrackTimecodeScale" level="3" id="0x23314F" type="float" mandatory="1" minver="1" maxver="3" webm="0" default="1.0" range="&gt; 0">DEPRECATED, DO NOT USE. The scale to apply on this track to work at normal speed in relation with other tracks (mostly used to adjust video speed when the audio length differs).</element>
    <element name="TrackOffset" level="3" id="0x537F" type="integer" webm="0" default="0">A value to add to the Block\'s Timecode. This can be used to adjust the playback offset of a track.</element>
    <element name="MaxBlockAdditionID" level="3" id="0x55EE" type="uinteger" mandatory="1" minver="1" webm="0" default="0">The maximum value of <a href="http://www.matroska.org/technical/specs/index.html#BlockAddID">BlockAddID</a>. A value 0 means there is no <a href="http://www.matroska.org/technical/specs/index.html#BlockAdditions">BlockAdditions</a> for this track.</element>
    <element name="Name" cppname="TrackName" level="3" id="0x536E" type="utf-8" minver="1">A human-readable track name.</element>
    <element name="Language" cppname="TrackLanguage" level="3" id="0x22B59C" type="string" minver="1" default="eng">Specifies the language of the track in the <a href="http://www.matroska.org/technical/specs/index.html#languages">Matroska languages form</a>.</element>
    <element name="CodecID" level="3" id="0x86" type="string" mandatory="1" minver="1">An ID corresponding to the codec, see the <a href="http://www.matroska.org/technical/specs/codecid/index.html">codec page</a> for more info.</element>
    <element name="CodecPrivate" level="3" id="0x63A2" type="binary" minver="1">Private data only known to the codec.</element>
    <element name="CodecName" level="3" id="0x258688" type="utf-8" minver="1">A human-readable string specifying the codec.</element>
    <element name="AttachmentLink" cppname="TrackAttachmentLink" level="3" id="0x7446" type="uinteger" minver="1" webm="0" range="not 0">The UID of an attachment that is used by this codec.</element>
    <element name="CodecSettings" level="3" id="0x3A9697" type="utf-8" webm="0">A string describing the encoding setting used.</element>
    <element name="CodecInfoURL" level="3" id="0x3B4040" type="string" multiple="1" webm="0">A URL to find information about the codec used.</element>
    <element name="CodecDownloadURL" level="3" id="0x26B240" type="string" multiple="1" webm="0">A URL to download about the codec used.</element>
    <element name="CodecDecodeAll" level="3" id="0xAA" type="uinteger" mandatory="1" minver="2" webm="0" default="1" range="0-1">The codec can decode potentially damaged data (1 bit).</element>
    <element name="TrackOverlay" level="3" id="0x6FAB" type="uinteger" multiple="1" minver="1" webm="0">Specify that this track is an overlay track for the Track specified (in the u-integer). That means when this track has a gap (see <a href="http://www.matroska.org/technical/specs/index.html#SilentTracks">SilentTracks</a>) the overlay track should be used instead. The order of multiple TrackOverlay matters, the first one is the one that should be used. If not found it should be the second, etc.</element>
    <element name="TrackTranslate" level="3" id="0x6624" type="master" multiple="1" minver="1" webm="0">The track identification for the given Chapter Codec.</element>
    <element name="TrackTranslateEditionUID" level="4" id="0x66FC" type="uinteger" multiple="1" minver="1" webm="0">Specify an edition UID on which this translation applies. When not specified, it means for all editions found in the segment.</element>
    <element name="TrackTranslateCodec" level="4" id="0x66BF" type="uinteger" mandatory="1" minver="1" webm="0">The <a href="http://www.matroska.org/technical/specs/index.html#ChapProcessCodecID">chapter codec</a> using this ID (0: Matroska Script, 1: DVD-menu).</element>
    <element name="TrackTranslateTrackID" level="4" id="0x66A5" type="binary" mandatory="1" minver="1" webm="0">The binary value used to represent this track in the chapter codec data. The format depends on the <a href="http://www.matroska.org/technical/specs/index.html#ChapProcessCodecID">ChapProcessCodecID</a> used.</element>
    <element name="Video" cppname="TrackVideo" level="3" id="0xE0" type="master" minver="1">Video settings.</element>
    <element name="FlagInterlaced" cppname="VideoFlagInterlaced" level="4" id="0x9A" type="uinteger" mandatory="1" minver="2" webm="1" default="0" range="0-1">Set if the video is interlaced. (1 bit)</element>
    <element name="StereoMode" cppname="VideoStereoMode" level="4" id="0x53B8" type="uinteger" minver="3" webm="1" default="0">Stereo-3D video mode (0: mono, 1: side by side (left eye is first), 2: top-bottom (right eye is first), 3: top-bottom (left eye is first), 4: checkboard (right is first), 5: checkboard (left is first), 6: row interleaved (right is first), 7: row interleaved (left is first), 8: column interleaved (right is first), 9: column interleaved (left is first), 10: anaglyph (cyan/red), 11: side by side (right eye is first), 12: anaglyph (green/magenta), 13 both eyes laced in one Block (left eye is first), 14 both eyes laced in one Block (right eye is first)) . There are some more details on <a href="http://www.matroska.org/technical/specs/notes.html#3D">3D support in the Specification Notes</a>.</element>
    <element name="OldStereoMode" level="4" id="0x53B9" type="uinteger" maxver="0" webm="0" divx="0">DEPRECATED, DO NOT USE. Bogus StereoMode value used in old versions of libmatroska. (0: mono, 1: right eye, 2: left eye, 3: both eyes).</element>
    <element name="PixelWidth" cppname="VideoPixelWidth" level="4" id="0xB0" type="uinteger" mandatory="1" minver="1" range="not 0">Width of the encoded video frames in pixels.</element>
    <element name="PixelHeight" cppname="VideoPixelHeight" level="4" id="0xBA" type="uinteger" mandatory="1" minver="1" range="not 0">Height of the encoded video frames in pixels.</element>
    <element name="PixelCropBottom" cppname="VideoPixelCropBottom" level="4" id="0x54AA" type="uinteger" minver="1" default="0">The number of video pixels to remove at the bottom of the image (for HDTV content).</element>
    <element name="PixelCropTop" cppname="VideoPixelCropTop" level="4" id="0x54BB" type="uinteger" minver="1" default="0">The number of video pixels to remove at the top of the image.</element>
    <element name="PixelCropLeft" cppname="VideoPixelCropLeft" level="4" id="0x54CC" type="uinteger" minver="1" default="0">The number of video pixels to remove on the left of the image.</element>
    <element name="PixelCropRight" cppname="VideoPixelCropRight" level="4" id="0x54DD" type="uinteger" minver="1" default="0">The number of video pixels to remove on the right of the image.</element>
    <element name="DisplayWidth" cppname="VideoDisplayWidth" level="4" id="0x54B0" type="uinteger" minver="1" default="PixelWidth" range="not 0">Width of the video frames to display. The default value is only valid when <a href="http://www.matroska.org/technical/specs/index.html#DisplayUnit">DisplayUnit</a> is 0.</element>
    <element name="DisplayHeight" cppname="VideoDisplayHeight" level="4" id="0x54BA" type="uinteger" minver="1" default="PixelHeight" range="not 0">Height of the video frames to display. The default value is only valid when <a href="http://www.matroska.org/technical/specs/index.html#DisplayUnit">DisplayUnit</a> is 0.</element>
    <element name="DisplayUnit" cppname="VideoDisplayUnit" level="4" id="0x54B2" type="uinteger" minver="1" default="0">How DisplayWidth &amp; DisplayHeight should be interpreted (0: pixels, 1: centimeters, 2: inches, 3: Display Aspect Ratio).</element>
    <element name="AspectRatioType" cppname="VideoAspectRatio" level="4" id="0x54B3" type="uinteger" minver="1" default="0">Specify the possible modifications to the aspect ratio (0: free resizing, 1: keep aspect ratio, 2: fixed).</element>
    <element name="ColourSpace" cppname="VideoColourSpace" level="4" id="0x2EB524" type="binary" minver="1" webm="0" bytesize="4">Same value as in AVI (32 bits).</element>
    <element name="GammaValue" cppname="VideoGamma" level="4" id="0x2FB523" type="float" webm="0" range="&gt; 0">Gamma Value.</element>
    <element name="FrameRate" cppname="VideoFrameRate" level="4" id="0x2383E3" type="float" range="&gt; 0">Number of frames per second. <strong>Informational</strong> only.</element>
    <element name="Audio" cppname="TrackAudio" level="3" id="0xE1" type="master" minver="1">Audio settings.</element>
    <element name="SamplingFrequency" cppname="AudioSamplingFreq" level="4" id="0xB5" type="float" mandatory="1" minver="1" default="8000.0" range="&gt; 0">Sampling frequency in Hz.</element>
    <element name="OutputSamplingFrequency" cppname="AudioOutputSamplingFreq" level="4" id="0x78B5" type="float" minver="1" default="Sampling Frequency" range="&gt; 0">Real output sampling frequency in Hz (used for SBR techniques).</element>
    <element name="Channels" cppname="AudioChannels" level="4" id="0x9F" type="uinteger" mandatory="1" minver="1" default="1" range="not 0">Numbers of channels in the track.</element>
    <element name="ChannelPositions" cppname="AudioPosition" level="4" id="0x7D7B" type="binary" webm="0">Table of horizontal angles for each successive channel, see <a href="http://www.matroska.org/technical/specs/index.html#channelposition">appendix</a>.</element>
    <element name="BitDepth" cppname="AudioBitDepth" level="4" id="0x6264" type="uinteger" minver="1" range="not 0">Bits per sample, mostly used for PCM.</element>
    <element name="TrackOperation" level="3" id="0xE2" type="master" minver="3" webm="0">Operation that needs to be applied on tracks to create this virtual track. For more details <a href="http://www.matroska.org/technical/specs/notes.html#TrackOperation">look at the Specification Notes</a> on the subject.</element>
    <element name="TrackCombinePlanes" level="4" id="0xE3" type="master" minver="3" webm="0">Contains the list of all video plane tracks that need to be combined to create this 3D track</element>
    <element name="TrackPlane" level="5" id="0xE4" type="master" mandatory="1" multiple="1" minver="3" webm="0">Contains a video plane track that need to be combined to create this 3D track</element>
    <element name="TrackPlaneUID" level="6" id="0xE5" type="uinteger" mandatory="1" minver="3" webm="0" range="not 0">The trackUID number of the track representing the plane.</element>
    <element name="TrackPlaneType" level="6" id="0xE6" type="uinteger" mandatory="1" minver="3" webm="0">The kind of plane this track corresponds to (0: left eye, 1: right eye, 2: background).</element>
    <element name="TrackJoinBlocks" level="4" id="0xE9" type="master" minver="3" webm="0">Contains the list of all tracks whose Blocks need to be combined to create this virtual track</element>
    <element name="TrackJoinUID" level="5" id="0xED" type="uinteger" mandatory="1" multiple="1" minver="3" webm="0" range="not 0">The trackUID number of a track whose blocks are used to create this virtual track.</element>
    <element name="TrickTrackUID" level="3" id="0xC0" type="uinteger" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="TrickTrackSegmentUID" level="3" id="0xC1" type="binary" divx="1" bytesize="16"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="TrickTrackFlag" level="3" id="0xC6" type="uinteger" divx="1" default="0"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="TrickMasterTrackUID" level="3" id="0xC7" type="uinteger" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="TrickMasterTrackSegmentUID" level="3" id="0xC4" type="binary" divx="1" bytesize="16"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/Smooth_FF_RW">DivX trick track extenstions</a></element>
    <element name="ContentEncodings" level="3" id="0x6D80" type="master" minver="1" webm="0">Settings for several content encoding mechanisms like compression or encryption.</element>
    <element name="ContentEncoding" level="4" id="0x6240" type="master" mandatory="1" multiple="1" minver="1" webm="0">Settings for one content encoding like compression or encryption.</element>
    <element name="ContentEncodingOrder" level="5" id="0x5031" type="uinteger" mandatory="1" minver="1" webm="0" default="0">Tells when this modification was used during encoding/muxing starting with 0 and counting upwards. The decoder/demuxer has to start with the highest order number it finds and work its way down. This value has to be unique over all ContentEncodingOrder elements in the segment.</element>
    <element name="ContentEncodingScope" level="5" id="0x5032" type="uinteger" mandatory="1" minver="1" webm="0" default="1" range="not 0">A bit field that describes which elements have been modified in this way. Values (big endian) can be OR\'ed. Possible values:<br /> 1 - all frame contents,<br /> 2 - the track\'s private data,<br /> 4 - the next ContentEncoding (next ContentEncodingOrder. Either the data inside ContentCompression and/or ContentEncryption)</element>
    <element name="ContentEncodingType" level="5" id="0x5033" type="uinteger" mandatory="1" minver="1" webm="0" default="0">A value describing what kind of transformation has been done. Possible values:<br /> 0 - compression,<br /> 1 - encryption</element>
    <element name="ContentCompression" level="5" id="0x5034" type="master" minver="1" webm="0">Settings describing the compression used. Must be present if the value of ContentEncodingType is 0 and absent otherwise. Each block must be decompressable even if no previous block is available in order not to prevent seeking.</element>
    <element name="ContentCompAlgo" level="6" id="0x4254" type="uinteger" mandatory="1" minver="1" webm="0" default="0">The compression algorithm used. Algorithms that have been specified so far are:<br /> 0 - zlib,<br /> <del>1 - bzlib,</del><br /> <del>2 - lzo1x</del><br /> 3 - Header Stripping</element>
    <element name="ContentCompSettings" level="6" id="0x4255" type="binary" minver="1" webm="0">Settings that might be needed by the decompressor. For Header Stripping (ContentCompAlgo=3), the bytes that were removed from the beggining of each frames of the track.</element>
    <element name="ContentEncryption" level="5" id="0x5035" type="master" minver="1" webm="0">Settings describing the encryption used. Must be present if the value of ContentEncodingType is 1 and absent otherwise.</element>
    <element name="ContentEncAlgo" level="6" id="0x47E1" type="uinteger" minver="1" webm="0" default="0">The encryption algorithm used. The value \'0\' means that the contents have not been encrypted but only signed. Predefined values:<br /> 1 - DES, 2 - 3DES, 3 - Twofish, 4 - Blowfish, 5 - AES</element>
    <element name="ContentEncKeyID" level="6" id="0x47E2" type="binary" minver="1" webm="0">For public key algorithms this is the ID of the public key the the data was encrypted with.</element>
    <element name="ContentSignature" level="6" id="0x47E3" type="binary" minver="1" webm="0">A cryptographic signature of the contents.</element>
    <element name="ContentSigKeyID" level="6" id="0x47E4" type="binary" minver="1" webm="0">This is the ID of the private key the data was signed with.</element>
    <element name="ContentSigAlgo" level="6" id="0x47E5" type="uinteger" minver="1" webm="0" default="0">The algorithm used for the signature. A value of \'0\' means that the contents have not been signed but only encrypted. Predefined values:<br /> 1 - RSA</element>
    <element name="ContentSigHashAlgo" level="6" id="0x47E6" type="uinteger" minver="1" webm="0" default="0">The hash algorithm used for the signature. A value of \'0\' means that the contents have not been signed but only encrypted. Predefined values:<br /> 1 - SHA1-160<br /> 2 - MD5</element>
    <element name="Cues" level="1" id="0x1C53BB6B" type="master" minver="1">A top-level element to speed seeking access. All entries are local to the segment. Should be mandatory for non <a href="http://www.matroska.org/technical/streaming/index.hmtl">"live" streams</a>.</element>
    <element name="CuePoint" level="2" id="0xBB" type="master" mandatory="1" multiple="1" minver="1">Contains all information relative to a seek point in the segment.</element>
    <element name="CueTime" level="3" id="0xB3" type="uinteger" mandatory="1" minver="1">Absolute timecode according to the segment time base.</element>
    <element name="CueTrackPositions" level="3" id="0xB7" type="master" mandatory="1" multiple="1" minver="1">Contain positions for different tracks corresponding to the timecode.</element>
    <element name="CueTrack" level="4" id="0xF7" type="uinteger" mandatory="1" minver="1" range="not 0">The track for which a position is given.</element>
    <element name="CueClusterPosition" level="4" id="0xF1" type="uinteger" mandatory="1" minver="1">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of the Cluster containing the required Block.</element>
    <element name="CueRelativePosition" level="4" id="0xF0" type="uinteger" mandatory="0" minver="4" webm="0">The relative position of the referenced block inside the cluster with 0 being the first possible position for an element inside that cluster.</element>
    <element name="CueDuration" level="4" id="0xB2" type="uinteger" mandatory="0" minver="4" webm="0">The duration of the block according to the segment time base. If missing the track\'s DefaultDuration does not apply and no duration information is available in terms of the cues.</element>
    <element name="CueBlockNumber" level="4" id="0x5378" type="uinteger" minver="1" default="1" range="not 0">Number of the Block in the specified Cluster.</element>
    <element name="CueCodecState" level="4" id="0xEA" type="uinteger" minver="2" webm="0" default="0">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of the Codec State corresponding to this Cue element. 0 means that the data is taken from the initial Track Entry.</element>
    <element name="CueReference" level="4" id="0xDB" type="master" multiple="1" minver="2" webm="0">The Clusters containing the required referenced Blocks.</element>
    <element name="CueRefTime" level="5" id="0x96" type="uinteger" mandatory="1" minver="2" webm="0">Timecode of the referenced Block.</element>
    <element name="CueRefCluster" level="5" id="0x97" type="uinteger" mandatory="1" webm="0">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">Position</a> of the Cluster containing the referenced Block.</element>
    <element name="CueRefNumber" level="5" id="0x535F" type="uinteger" webm="0" default="1" range="not 0">Number of the referenced Block of Track X in the specified Cluster.</element>
    <element name="CueRefCodecState" level="5" id="0xEB" type="uinteger" webm="0" default="0">The <a href="http://www.matroska.org/technical/specs/notes.html#Position_References">position</a> of the Codec State corresponding to this referenced element. 0 means that the data is taken from the initial Track Entry.</element>
    <element name="Attachments" level="1" id="0x1941A469" type="master" minver="1" webm="0">Contain attached files.</element>
    <element name="AttachedFile" level="2" id="0x61A7" type="master" mandatory="1" multiple="1" minver="1" webm="0">An attached file.</element>
    <element name="FileDescription" level="3" id="0x467E" type="utf-8" minver="1" webm="0">A human-friendly name for the attached file.</element>
    <element name="FileName" level="3" id="0x466E" type="utf-8" mandatory="1" minver="1" webm="0">Filename of the attached file.</element>
    <element name="FileMimeType" level="3" id="0x4660" type="string" mandatory="1" minver="1" webm="0">MIME type of the file.</element>
    <element name="FileData" level="3" id="0x465C" type="binary" mandatory="1" minver="1" webm="0">The data of the file.</element>
    <element name="FileUID" level="3" id="0x46AE" type="uinteger" mandatory="1" minver="1" webm="0" range="not 0">Unique ID representing the file, as random as possible.</element>
    <element name="FileReferral" level="3" id="0x4675" type="binary" webm="0">A binary value that a track/codec can refer to when the attachment is needed.</element>
    <element name="FileUsedStartTime" level="3" id="0x4661" type="uinteger" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/World_Fonts">DivX font extension</a></element>
    <element name="FileUsedEndTime" level="3" id="0x4662" type="uinteger" divx="1"><a href="http://developer.divx.com/docs/divx_plus_hd/format_features/World_Fonts">DivX font extension</a></element>
    <element name="Chapters" level="1" id="0x1043A770" type="master" minver="1" webm="1">A system to define basic menus and partition data. For more detailed information, look at the <a href="http://www.matroska.org/technical/specs/chapters/index.html">Chapters Explanation</a>.</element>
    <element name="EditionEntry" level="2" id="0x45B9" type="master" mandatory="1" multiple="1" minver="1" webm="1">Contains all information about a segment edition.</element>
    <element name="EditionUID" level="3" id="0x45BC" type="uinteger" minver="1" webm="0" range="not 0">A unique ID to identify the edition. It\'s useful for tagging an edition.</element>
    <element name="EditionFlagHidden" level="3" id="0x45BD" type="uinteger" mandatory="1" minver="1" webm="0" default="0" range="0-1">If an edition is hidden (1), it should not be available to the user interface (but still to Control Tracks). (1 bit)</element>
    <element name="EditionFlagDefault" level="3" id="0x45DB" type="uinteger" mandatory="1" minver="1" webm="0" default="0" range="0-1">If a flag is set (1) the edition should be used as the default one. (1 bit)</element>
    <element name="EditionFlagOrdered" level="3" id="0x45DD" type="uinteger" minver="1" webm="0" default="0" range="0-1">Specify if the chapters can be defined multiple times and the order to play them is enforced. (1 bit)</element>
    <element name="ChapterAtom" level="3" recursive="1" id="0xB6" type="master" mandatory="1" multiple="1" minver="1" webm="1">Contains the atom information to use as the chapter atom (apply to all tracks).</element>
    <element name="ChapterUID" level="4" id="0x73C4" type="uinteger" mandatory="1" minver="1" webm="1" range="not 0">A unique ID to identify the Chapter.</element>
    <element name="ChapterStringUID" level="4" id="0x5654" type="utf-8" mandatory="0" minver="3" webm="1">A unique string ID to identify the Chapter. Use for <a href="http://dev.w3.org/html5/webvtt/#webvtt-cue-identifier">WebVTT cue identifier storage</a>.</element>
    <element name="ChapterTimeStart" level="4" id="0x91" type="uinteger" mandatory="1" minver="1" webm="1">Timecode of the start of Chapter (not scaled).</element>
    <element name="ChapterTimeEnd" level="4" id="0x92" type="uinteger" minver="1" webm="0">Timecode of the end of Chapter (timecode excluded, not scaled).</element>
    <element name="ChapterFlagHidden" level="4" id="0x98" type="uinteger" mandatory="1" minver="1" webm="0" default="0" range="0-1">If a chapter is hidden (1), it should not be available to the user interface (but still to Control Tracks). (1 bit)</element>
    <element name="ChapterFlagEnabled" level="4" id="0x4598" type="uinteger" mandatory="1" minver="1" webm="0" default="1" range="0-1">Specify wether the chapter is enabled. It can be enabled/disabled by a Control Track. When disabled, the movie should skip all the content between the TimeStart and TimeEnd of this chapter. (1 bit)</element>
    <element name="ChapterSegmentUID" level="4" id="0x6E67" type="binary" minver="1" webm="0" range="&gt;0" bytesize="16">A segment to play in place of this chapter. Edition ChapterSegmentEditionUID should be used for this segment, otherwise no edition is used.</element>
    <element name="ChapterSegmentEditionUID" level="4" id="0x6EBC" type="uinteger" minver="1" webm="0" range="not 0">The EditionUID to play from the segment linked in ChapterSegmentUID.</element>
    <element name="ChapterPhysicalEquiv" level="4" id="0x63C3" type="uinteger" minver="1" webm="0">Specify the physical equivalent of this ChapterAtom like "DVD" (60) or "SIDE" (50), see <a href="http://www.matroska.org/technical/specs/index.html#physical">complete list of values</a>.</element>
    <element name="ChapterTrack" level="4" id="0x8F" type="master" minver="1" webm="0">List of tracks on which the chapter applies. If this element is not present, all tracks apply</element>
    <element name="ChapterTrackNumber" level="5" id="0x89" type="uinteger" mandatory="1" multiple="1" minver="1" webm="0" range="not 0">UID of the Track to apply this chapter too. In the absense of a control track, choosing this chapter will select the listed Tracks and deselect unlisted tracks. Absense of this element indicates that the Chapter should be applied to any currently used Tracks.</element>
    <element name="ChapterDisplay" level="4" id="0x80" type="master" multiple="1" minver="1" webm="1">Contains all possible strings to use for the chapter display.</element>
    <element name="ChapString" cppname="ChapterString" level="5" id="0x85" type="utf-8" mandatory="1" minver="1" webm="1">Contains the string to use as the chapter atom.</element>
    <element name="ChapLanguage" cppname="ChapterLanguage" level="5" id="0x437C" type="string" mandatory="1" multiple="1" minver="1" webm="1" default="eng">The languages corresponding to the string, in the <a href="http://lcweb.loc.gov/standards/iso639-2/englangn.html#two">bibliographic ISO-639-2 form</a>.</element>
    <element name="ChapCountry" cppname="ChapterCountry" level="5" id="0x437E" type="string" multiple="1" minver="1" webm="0">The countries corresponding to the string, same 2 octets as in <a href="http://www.iana.org/cctld/cctld-whois.htm">Internet domains</a>.</element>
    <element name="ChapProcess" cppname="ChapterProcess" level="4" id="0x6944" type="master" multiple="1" minver="1" webm="0">Contains all the commands associated to the Atom.</element>
    <element name="ChapProcessCodecID" cppname="ChapterProcessCodecID" level="5" id="0x6955" type="uinteger" mandatory="1" minver="1" webm="0" default="0">Contains the type of the codec used for the processing. A value of 0 means native Matroska processing (to be defined), a value of 1 means the <a href="http://www.matroska.org/technical/specs/chapters/index.html#dvd">DVD</a> command set is used. More codec IDs can be added later.</element>
    <element name="ChapProcessPrivate" cppname="ChapterProcessPrivate" level="5" id="0x450D" type="binary" minver="1" webm="0">Some optional data attached to the ChapProcessCodecID information. <a href="http://www.matroska.org/technical/specs/chapters/index.html#dvd">For ChapProcessCodecID = 1</a>, it is the "DVD level" equivalent.</element>
    <element name="ChapProcessCommand" cppname="ChapterProcessCommand" level="5" id="0x6911" type="master" multiple="1" minver="1" webm="0">Contains all the commands associated to the Atom.</element>
    <element name="ChapProcessTime" cppname="ChapterProcessTime" level="6" id="0x6922" type="uinteger" mandatory="1" minver="1" webm="0">Defines when the process command should be handled (0: during the whole chapter, 1: before starting playback, 2: after playback of the chapter).</element>
    <element name="ChapProcessData" cppname="ChapterProcessData" level="6" id="0x6933" type="binary" mandatory="1" minver="1" webm="0">Contains the command information. The data should be interpreted depending on the ChapProcessCodecID value. <a href="http://www.matroska.org/technical/specs/chapters/index.html#dvd">For ChapProcessCodecID = 1</a>, the data correspond to the binary DVD cell pre/post commands.</element>
    <element name="Tags" level="1" id="0x1254C367" type="master" multiple="1" minver="1" webm="0">Element containing elements specific to Tracks/Chapters. A list of valid tags can be found <a href="http://www.matroska.org/technical/specs/tagging/index.html">here.</a></element>
    <element name="Tag" level="2" id="0x7373" type="master" mandatory="1" multiple="1" minver="1" webm="0">Element containing elements specific to Tracks/Chapters.</element>
    <element name="Targets" cppname="TagTargets" level="3" id="0x63C0" type="master" mandatory="1" minver="1" webm="0">Contain all UIDs where the specified meta data apply. It is empty to describe everything in the segment.</element>
    <element name="TargetTypeValue" cppname="TagTargetTypeValue" level="4" id="0x68CA" type="uinteger" minver="1" webm="0" default="50">A number to indicate the logical level of the target (see <a href="http://www.matroska.org/technical/specs/tagging/index.html#targettypes">TargetType</a>).</element>
    <element name="TargetType" cppname="TagTargetType" level="4" id="0x63CA" type="string" minver="1" webm="0">An <strong>informational</strong> string that can be used to display the logical level of the target like "ALBUM", "TRACK", "MOVIE", "CHAPTER", etc (see <a href="http://www.matroska.org/technical/specs/tagging/index.html#targettypes">TargetType</a>).</element>
    <element name="TagTrackUID" level="4" id="0x63C5" type="uinteger" multiple="1" minver="1" webm="0" default="0">A unique ID to identify the Track(s) the tags belong to. If the value is 0 at this level, the tags apply to all tracks in the Segment.</element>
    <element name="TagEditionUID" level="4" id="0x63C9" type="uinteger" multiple="1" minver="1" webm="0" default="0">A unique ID to identify the EditionEntry(s) the tags belong to. If the value is 0 at this level, the tags apply to all editions in the Segment.</element>
    <element name="TagChapterUID" level="4" id="0x63C4" type="uinteger" multiple="1" minver="1" webm="0" default="0">A unique ID to identify the Chapter(s) the tags belong to. If the value is 0 at this level, the tags apply to all chapters in the Segment.</element>
    <element name="TagAttachmentUID" level="4" id="0x63C6" type="uinteger" multiple="1" minver="1" webm="0" default="0">A unique ID to identify the Attachment(s) the tags belong to. If the value is 0 at this level, the tags apply to all the attachments in the Segment.</element>
    <element name="SimpleTag" cppname="TagSimple" level="3" recursive="1" id="0x67C8" type="master" mandatory="1" multiple="1" minver="1" webm="0">Contains general information about the target.</element>
    <element name="TagName" level="4" id="0x45A3" type="utf-8" mandatory="1" minver="1" webm="0">The name of the Tag that is going to be stored.</element>
    <element name="TagLanguage" level="4" id="0x447A" type="string" mandatory="1" minver="1" webm="0" default="und">Specifies the language of the tag specified, in the <a href="http://www.matroska.org/technical/specs/index.html#languages">Matroska languages form</a>.</element>
    <element name="TagDefault" level="4" id="0x4484" type="uinteger" mandatory="1" minver="1" webm="0" default="1" range="0-1">Indication to know if this is the default/original language to use for the given tag. (1 bit)</element>
    <element name="TagString" level="4" id="0x4487" type="utf-8" minver="1" webm="0">The value of the Tag.</element>
    <element name="TagBinary" level="4" id="0x4485" type="binary" minver="1" webm="0">The values of the Tag if it is binary. Note that this cannot be used in the same SimpleTag as TagString.</element>
</table>`;

class EBMLSpec {

    constructor(xmlString) {
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        let definitions = xmlDoc.childNodes[0].childNodes;
        this.definitions = definitions;
        this.names = {};
        this.ids = {};

        this.validation = {};
        this.validation.default = function (value) { return true; };

        for (let i = 0; i < definitions.length; i++) {
            let element = definitions[i];
            if (element.nodeType === 3) {
                continue;
            }
            let def = {};
            def.name = element.getAttribute('name');
            def.level = parseInt(element.getAttribute('level'), 10);
            def.id = element.getAttribute('id');
            def.type = element.getAttribute('type');
            def.mandatory = Boolean(parseInt(element.getAttribute('mandatory')));
            def.multiple = Boolean(parseInt(element.getAttribute('multiple')));
            def.minver = element.getAttribute('minver');
            def.maxver = element.getAttribute('maxver');
            def.range = element.getAttribute('range');
            def.default = element.getAttribute('default');
            def.description = element.textContent;

            switch (def.type) {
                case 'uinteger':
                case 'integer':
                    if (def.default) def.default = parseInt(def.default, 10);
                    break;
                case 'float':
                    if (def.default) def.default = parseFloat(def.default);
                    break;
                default:
                    break;
            }
            def.validator = this.validation.default;

            this.names[def.name] = def;
            this.ids[def.id] = def;
        }
    }

    getType(id) {
        if (this.ids.hasOwnProperty(id))
            return this.ids[id].type;
        else return 'unknown';
    }

    getName(id) {
        if (this.ids.hasOwnProperty(id))
            return this.ids[id].name;
        else return 'unknown';
    }
}
export const MatroskaSpec = new EBMLSpec(matroskaSpecXML);
