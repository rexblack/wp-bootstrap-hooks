import './editor.scss';

/**
 * External dependencies
 */
import classnames from 'classnames';
import { get } from 'lodash';
import humanizeString from 'humanize-string';
import { camelizeKeys } from 'humps';

import icon from './media-container-icon';

const ALLOWED_MEDIA_TYPES = [ 'image', 'video' ];

/**
 * WordPress dependencies
 */
const { __, _x } = wp.i18n;
const {
	BlockControls,
	BlockVerticalAlignmentToolbar,
	InnerBlocks,
	InspectorControls,
	PanelColorSettings,
	BlockIcon,
	MediaPlaceholder,
	withColors,
} = wp.editor;
const { Component, Fragment } = wp.element;
const {
	PanelBody,
	TextareaControl,
	ToggleControl,
	Toolbar,
	ExternalLink,
	FocalPointPicker,
	SelectControl
} = wp.components;

const { withSelect } = wp.data;

/**
 * Internal dependencies
 */
import MediaContainer from './media-container';

/**
 * Constants
 */
const ALLOWED_BLOCKS = [ 'core/button', 'core/paragraph', 'core/heading', 'core/list' ];
const TEMPLATE = [
	[ 'core/heading', { level: 1, className: 'display-4', placeholder: _x( 'Title…', 'title placeholder' ) } ],
	[ 'core/paragraph', { className: 'lead', placeholder: _x( 'Content…', 'content placeholder' ) } ],
];
// this limits the resize to a safe zone to avoid making broken layouts
const WIDTH_CONSTRAINT_PERCENTAGE = 15;
const applyWidthConstraints = ( width ) => Math.max( WIDTH_CONSTRAINT_PERCENTAGE, Math.min( width, 100 - WIDTH_CONSTRAINT_PERCENTAGE ) );

class MediaTextEdit extends Component {
	constructor() {
		super( ...arguments );

		this.onSelectMedia = this.onSelectMedia.bind( this );
		this.onWidthChange = this.onWidthChange.bind( this );
		this.commitWidthChange = this.commitWidthChange.bind( this );
		this.state = {
			mediaWidth: null,
		};
	}

	onSelectMedia( media ) {
		const { setAttributes, attributes } = this.props;
		const { mediaSize } = attributes;

		let mediaType;
		let src;
		// for media selections originated from a file upload.
		if ( media.media_type ) {
			if ( media.media_type === 'image' ) {
				mediaType = 'image';
			} else {
				// only images and videos are accepted so if the media_type is not an image we can assume it is a video.
				// video contain the media type of 'file' in the object returned from the rest api.
				mediaType = 'video';
			}
		} else { // for media selections originated from existing files in the media library.
			mediaType = media.type;
		}

		let sizes = null;

		if ( mediaType === 'image' ) {
			// Try the "large" size URL, falling back to the "full" size URL below.
			sizes = get( media, [ 'sizes' ] ) || get( media, [ 'media_details', 'sizes' ] );
			sizes = sizes && Object.assign({}, ...Object.entries(sizes).map(([ key, value ]) => ({
				[key]: {
					...value,
					url: value.url || value.source_url
				}
			})));
			// src = get( media, [ 'sizes', mediaSize, 'url' ] ) || get( media, [ 'media_details', 'sizes', mediaSize, 'source_url' ] );
		}

		setAttributes( {
			mediaAlt: media.alt,
			mediaId: media.id,
			mediaType,
			mediaUrl: src || media.url,
			mediaSizes: sizes,
			imageFill: undefined,
			focalPoint: undefined,
		} );
	}

	onWidthChange( width ) {
		this.setState( {
			mediaWidth: applyWidthConstraints( width ),
		} );
	}

	commitWidthChange( width ) {
		const { setAttributes } = this.props;

		setAttributes( {
			mediaWidth: applyWidthConstraints( width ),
		} );
		this.setState( {
			mediaWidth: null,
		} );
	}

	renderMediaArea() {
		const { image, attributes } = this.props;
		const { mediaAlt, mediaId, mediaPosition, mediaType, mediaUrl, mediaWidth, imageFill, focalPoint, mediaSize, mediaSizes } = attributes;

		let src = mediaUrl;

		if (mediaType === 'image' && mediaSize && mediaSizes && mediaSizes[mediaSize]) {
			src = mediaSizes[mediaSize].url || mediaUrl;
		}

		return (
			<MediaContainer
				className="block-library-media-text__media-container"
				onSelectMedia={ this.onSelectMedia }
				onWidthChange={ this.onWidthChange }
				commitWidthChange={ this.commitWidthChange }
				{ ...{ mediaAlt, mediaId, mediaType, mediaPosition, mediaWidth, imageFill, focalPoint } }
				mediaUrl={src}
			/>
		);
	}

	render() {
		const {
			attributes,
			className,
			backgroundColor,
			textColor,
			isSelected,
			setAttributes,
			setBackgroundColor,
			setTextColor,
			image
		} = this.props;

		const {
			isStackedOnMobile,
			mediaId,
			mediaAlt,
			mediaPosition,
			mediaType,
			mediaWidth,
			verticalAlignment,
			mediaUrl,
			mediaSizes,
			mediaSize,
			imageFill,
			focalPoint,
			parent
		} = attributes;

		const temporaryMediaWidth = this.state.mediaWidth;
		const classes = !parent ? classnames(
			className,
			'jumbotron',
			'p-0',
			// 'jumbotron-fluid',
			{
				[ mediaType && `has-media` ]: mediaType,
				[ backgroundColor && `bg-${backgroundColor.slug}` ]: backgroundColor,
				[ textColor && `text-${textColor.slug}` ]: textColor,
				// 'has-media-on-the-right': 'right' === mediaPosition,
				// 'is-selected': isSelected,
				// [ backgroundColor.class ]: backgroundColor.class,
				// 'is-stacked-on-mobile': isStackedOnMobile,
				// [ `is-vertically-aligned-${ verticalAlignment }` ]: verticalAlignment,
				// 'is-image-fill': imageFill,
			}
		) : className;


		const widthString = `${ temporaryMediaWidth || mediaWidth }%`;
		const style = {
			gridTemplateColumns: 'right' === mediaPosition ? `auto ${ widthString }` : `${ widthString } auto`,
			backgroundColor: backgroundColor.color,
		};
		const colorSettings = [ {
			value: backgroundColor.color,
			onChange: setBackgroundColor,
			label: __( 'Background Color' ),
		}, {
			value: textColor.color,
			onChange: setTextColor,
			label: __( 'Text Color' ),
		} ];
		const toolbarControls = [ {
			icon: 'align-pull-left',
			title: __( 'Show media on left' ),
			isActive: mediaPosition === 'left',
			onClick: () => setAttributes( { mediaPosition: 'left' } ),
		}, {
			icon: 'align-pull-right',
			title: __( 'Show media on right' ),
			isActive: mediaPosition === 'right',
			onClick: () => setAttributes( { mediaPosition: 'right' } ),
		} ];
		const onMediaAltChange = ( newMediaAlt ) => {
			setAttributes( { mediaAlt: newMediaAlt } );
		};
		const onVerticalAlignmentChange = ( alignment ) => {
			setAttributes( { verticalAlignment: alignment } );
		};
		const mediaTextGeneralSettings = (
			<PanelBody title={ __( 'Jumbotron Settings' ) }>
				{/*
				<ToggleControl
					label={ __( 'Stack on mobile' ) }
					checked={ isStackedOnMobile }
					onChange={ () => setAttributes( {
						isStackedOnMobile: ! isStackedOnMobile,
					} ) }
				/>
				{ mediaType === 'image' && ( <ToggleControl
					label={ __( 'Crop image to fill entire column' ) }
					checked={ imageFill }
					onChange={ () => setAttributes( {
						imageFill: ! imageFill,
					} ) }
				/> ) }
				{ imageFill && ( <FocalPointPicker
					label={ __( 'Focal Point Picker' ) }
					url={ mediaUrl }
					value={ focalPoint }
					onChange={ ( value ) => setAttributes( { focalPoint: value } ) }
				/> ) }
				{ mediaType === 'image' && ( <TextareaControl
					label={ __( 'Alt Text (Alternative Text)' ) }
					value={ mediaAlt }
					onChange={ onMediaAltChange }
					help={
						<Fragment>
							<ExternalLink href="https://www.w3.org/WAI/tutorials/images/decision-tree">
								{ __( 'Describe the purpose of the image' ) }
							</ExternalLink>
							{ __( 'Leave empty if the image is purely decorative.' ) }
						</Fragment>
					}
				/> ) }
				*/}
			</PanelBody>
		);

		return (
			<Fragment>
				<InspectorControls>
					{ mediaTextGeneralSettings }
					<PanelColorSettings
						title={ __( 'Color Settings' ) }
						initialOpen={ false }
						colorSettings={ colorSettings }
					/>
					<PanelBody title={ __( 'Media Settings' ) }>
						<MediaPlaceholder
							icon={ <BlockIcon icon={ icon } /> }
							labels={ {
								title: __( 'Media area' ),
							} }
							onSelect={ this.onSelectMedia }
							accept="image/*,video/*"
							allowedTypes={ ALLOWED_MEDIA_TYPES }
						/>
						{image && (
							<SelectControl
								label={__( 'Image Size' )}
								value={ attributes.mediaSize }
								options={ Object.keys(image.media_details.sizes).map((size) => ({
									label: __(humanizeString(size)),
									value: size
								})) }
								onChange={ ( value ) => this.props.setAttributes({
									...attributes,
									mediaSize: value
								})}
							/>
						)}
					</PanelBody>
				</InspectorControls>
				<BlockControls>
					<Toolbar
						controls={ toolbarControls }
					/>
					{/*
					<BlockVerticalAlignmentToolbar
						onChange={ onVerticalAlignmentChange }
						value={ verticalAlignment }
					/>*/}
				</BlockControls>
				<div className={ classes }>
					<div className="d-flex">
						<div className="w-100 flex-shrink-0 d-flex jumbotron m-0 p-0" style={{
							background: 'none',
							overflow: 'hidden'
						}}>
							{ this.renderMediaArea() }
						</div>
						<div className="w-100 flex-shrink-0 d-flex jumbotron m-0 rounded-0" style={{
							background: 'none',
							borderRadius: 'none',
							transform: 'translateX(-100%)'
						}}>
							<div className="container mt-auto">
							<InnerBlocks
								// allowedBlocks={ ALLOWED_BLOCKS }
								template={ TEMPLATE }
								templateInsertUpdatesSelection={ false }
							/>
							</div>
						</div>
					</div>
				</div>
			</Fragment>
		);
	}
}

export default withSelect( ( select, ownProps ) => {
	const { getMedia } = select( 'core' );
	const { attributes } = ownProps;
	const { mediaId } = attributes;

	return {
		image: mediaId ? getMedia( mediaId ) : null,
	};
} )( withColors( 'backgroundColor', 'textColor' )( MediaTextEdit ) );