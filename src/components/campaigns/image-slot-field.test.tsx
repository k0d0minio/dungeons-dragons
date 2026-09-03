import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { MAX_IMAGE_BYTES, type ImageMeta } from '@/lib/images/schema'

import { ImageSlotField } from './image-slot-field'

// The upload control (`dm-prep-suite/locations-handouts`). Two things are worth
// a test here and neither is the layout: the picture is fetched from the app's
// own authed route rather than a store address, and a file too big to send is
// refused here rather than after four megabytes have gone up table wifi.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENDPOINT = '/api/campaigns/c1/handouts/h1/image'

const IMAGE: ImageMeta = {
  contentType: 'image/jpeg',
  bytes: 51_200,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function slot(image: ImageMeta | null, onChanged = jest.fn()) {
  render(
    <ImageSlotField
      endpoint={ENDPOINT}
      image={image}
      label="The thing itself"
      hint="A scan, a photo of the page."
      alt="The pressed-flower letter"
      unwrap={(body) => (body as { handout: { id: string } }).handout}
      onChanged={onChanged}
    />,
  )

  return onChanged
}

/** A file of `size` bytes, as a phone's picker hands one over. */
function pickedFile(name: string, size: number, type = 'image/jpeg'): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('ImageSlotField', () => {
  it('shows an existing picture from the app’s own route, never a store address', () => {
    slot(IMAGE)

    const picture = screen.getByRole('img', { name: 'The pressed-flower letter' })
    const source = picture.getAttribute('src') ?? ''

    expect(source.startsWith(ENDPOINT)).toBe(true)
    expect(source).not.toContain('blob.vercel-storage.com')
  })

  // The URL is otherwise stable, so a replaced picture would keep showing the
  // old one out of the browser's cache.
  it('busts the browser cache with the upload timestamp', () => {
    slot(IMAGE)

    expect(screen.getByRole('img', { name: 'The pressed-flower letter' })).toHaveAttribute(
      'src',
      `${ENDPOINT}?v=${encodeURIComponent(IMAGE.uploadedAt)}`,
    )
  })

  it('says the size in a unit a DM reads', () => {
    slot(IMAGE)

    expect(screen.getByText('50 KB')).toBeInTheDocument()
  })

  it('offers to add rather than replace when there is no picture yet', () => {
    slot(null)

    expect(screen.getByRole('button', { name: 'Add an image' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('says what it takes and how big, from the same table the server checks', () => {
    slot(null)

    expect(screen.getByText(/JPEG, PNG or WebP, up to 4 MB/)).toBeInTheDocument()
  })

  it('posts the picked file as multipart and repaints from the answer', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn()
    slot(null, onChanged)

    mockFetch.mockResolvedValueOnce(jsonResponse({ handout: { id: 'h1' } }))

    await user.upload(screen.getByLabelText('The thing itself'), pickedFile('letter.jpg', 2_000))

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ id: 'h1' }))

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('image')).toBeInstanceOf(File)
  })

  // The server checks this too, on the bytes; this copy is only so a DM on
  // table wifi is not told no after the upload rather than before it.
  it('refuses an oversized file without sending it', async () => {
    const user = userEvent.setup()
    slot(null)

    await user.upload(
      screen.getByLabelText('The thing itself'),
      pickedFile('huge.jpg', MAX_IMAGE_BYTES + 1),
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('over 4 MB'))
  })

  it('says what the server said when an upload is refused', async () => {
    const user = userEvent.setup()
    slot(null)

    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { error: 'That is not an image this app can show. Use JPEG, PNG or WebP.' },
        415,
      ),
    )

    await user.upload(screen.getByLabelText('The thing itself'), pickedFile('trick.svg', 500))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That is not an image this app can show. Use JPEG, PNG or WebP.',
      ),
    )
  })

  it('removes a picture through the same endpoint and repaints from the answer', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn()
    slot(IMAGE, onChanged)

    mockFetch.mockResolvedValueOnce(jsonResponse({ handout: { id: 'h1' } }))

    await user.click(screen.getByRole('button', { name: 'Remove image' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ id: 'h1' }))
    expect(mockFetch).toHaveBeenCalledWith(ENDPOINT, { method: 'DELETE' })
  })

  it('says a network failure is a network failure', async () => {
    const user = userEvent.setup()
    slot(IMAGE)

    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('button', { name: 'Remove image' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That did not send. Check your connection and try again.',
      ),
    )
  })
})
