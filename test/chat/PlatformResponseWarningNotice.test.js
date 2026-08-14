const React = require('react');
const { fireEvent, render, screen } = require('@testing-library/react');
const PlatformResponseWarningNotice = require(
  '../../src/renderer/components/PlatformResponseWarningNotice'
).default;

describe('PlatformResponseWarningNotice', () => {
  test('renders a non-blocking platform warning and can be dismissed', () => {
    const onClose = jest.fn();
    render(<PlatformResponseWarningNotice warning={{
      retryExhausted: true,
      violations: [{ id: 'choices', message: '必须输出选项' }]
    }} onClose={onClose} />);

    expect(screen.getByRole('status')).toHaveTextContent('自动重试已达上限');
    expect(screen.getByRole('status')).toHaveTextContent('必须输出选项');
    fireEvent.click(screen.getByRole('button', { name: '关闭回复提醒' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders nothing without a warning', () => {
    const { container } = render(
      <PlatformResponseWarningNotice warning={null} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
